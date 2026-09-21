#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'docs', 'agent-context-routes.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const selectedRoute = value('route');
const check = args.includes('--check');
const report = args.includes('--report') || !check;

function fileBytes(relativePath) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) return { path: relativePath, exists: false, bytes: 0 };
    return { path: relativePath, exists: true, bytes: fs.statSync(absolute).size };
}

function budgetStatus(bytes, targetBytes, compactAtBytes) {
    if (bytes >= compactAtBytes) return 'maintenance-required';
    if (bytes > targetBytes) return 'within-runway';
    return 'at-target';
}

function validateBudget(owner, targetBytes, compactAtBytes) {
    if (!Number.isSafeInteger(targetBytes) || targetBytes <= 0) {
        return `${owner}: targetBytes must be a positive integer`;
    }
    if (!Number.isSafeInteger(compactAtBytes) || compactAtBytes <= targetBytes) {
        return `${owner}: compactAtBytes must be an integer greater than targetBytes`;
    }
    return null;
}

function summarizeRoute(route) {
    const required = route.required.map(fileBytes);
    const optional = (route.optional ?? []).map(fileBytes);
    const requiredBytes = required.reduce((sum, item) => sum + item.bytes, 0);
    const optionalBytes = optional.reduce((sum, item) => sum + item.bytes, 0);
    const missingRequired = required.filter(item => !item.exists).map(item => item.path);
    const missingOptional = optional.filter(item => !item.exists).map(item => item.path);
    const budgetError = validateBudget(`route ${route.id}`, route.targetBytes, route.compactAtBytes);
    const status = budgetError
        ? 'invalid-budget'
        : budgetStatus(requiredBytes, route.targetBytes, route.compactAtBytes);
    return {
        id: route.id,
        description: route.description,
        status,
        requiredBytes,
        optionalBytes,
        targetBytes: route.targetBytes,
        compactAtBytes: route.compactAtBytes,
        targetRatio: route.targetBytes ? Number((requiredBytes / route.targetBytes).toFixed(3)) : null,
        maintenanceHeadroomBytes: Number.isSafeInteger(route.compactAtBytes)
            ? route.compactAtBytes - requiredBytes
            : null,
        missingRequired,
        missingOptional,
        required,
        optional,
        budgetError,
    };
}

function summarizeAuthority(authority) {
    const file = fileBytes(authority.path);
    const budgetError = validateBudget(
        `authority ${authority.path}`,
        authority.targetBytes,
        authority.compactAtBytes,
    );
    let status = budgetError ? 'invalid-budget' : budgetStatus(
        file.bytes,
        authority.targetBytes,
        authority.compactAtBytes,
    );
    if (!file.exists) status = 'missing';
    return {
        path: authority.path,
        purpose: authority.purpose,
        status,
        bytes: file.bytes,
        targetBytes: authority.targetBytes,
        compactAtBytes: authority.compactAtBytes,
        targetRatio: authority.targetBytes ? Number((file.bytes / authority.targetBytes).toFixed(3)) : null,
        maintenanceHeadroomBytes: Number.isSafeInteger(authority.compactAtBytes)
            ? authority.compactAtBytes - file.bytes
            : null,
        budgetError,
    };
}

const routes = config.routes
    .filter(route => !selectedRoute || route.id === selectedRoute)
    .map(summarizeRoute);
const authorities = (config.authorities ?? []).map(summarizeAuthority);

if (selectedRoute && routes.length === 0) {
    console.error(`Unknown route: ${selectedRoute}`);
    process.exitCode = 2;
} else {
    const failures = [
        ...routes
            .filter(route => route.status === 'maintenance-required' || route.status === 'invalid-budget' || route.missingRequired.length > 0)
            .map(route => ({
                kind: 'route',
                id: route.id,
                status: route.status,
                bytes: route.requiredBytes,
                targetBytes: route.targetBytes,
                compactAtBytes: route.compactAtBytes,
                missingRequired: route.missingRequired,
                budgetError: route.budgetError,
            })),
        ...authorities
            .filter(authority => ['maintenance-required', 'invalid-budget', 'missing'].includes(authority.status))
            .map(authority => ({
                kind: 'authority',
                path: authority.path,
                status: authority.status,
                bytes: authority.bytes,
                targetBytes: authority.targetBytes,
                compactAtBytes: authority.compactAtBytes,
                budgetError: authority.budgetError,
            })),
    ];

    if (report) {
        console.log(JSON.stringify({
            schemaVersion: config.schemaVersion,
            measurement: config.measurement,
            policy: {
                ordinaryWork: 'below compactAtBytes is healthy; do not compact solely because targetBytes is exceeded',
                maintenance: 'at/above compactAtBytes, compact or restructure with substantial margin back toward targetBytes',
            },
            routes,
            authorities,
            failures,
        }, null, 2));
    }

    if (check && failures.length > 0) {
        console.error('Agent-context maintenance trigger reached or configuration invalid:');
        for (const failure of failures) {
            const owner = failure.kind === 'route' ? `route ${failure.id}` : failure.path;
            if (failure.budgetError) {
                console.error(`  - ${owner}: ${failure.budgetError}`);
            } else if (failure.status === 'missing') {
                console.error(`  - ${owner}: configured authority is missing`);
            } else if (failure.missingRequired?.length) {
                console.error(`  - ${owner}: missing required file(s): ${failure.missingRequired.join(', ')}`);
            } else {
                console.error(
                    `  - ${owner}: ${failure.bytes}B reached compactAtBytes=${failure.compactAtBytes}B `
                    + `(steady-state targetBytes=${failure.targetBytes}B)`,
                );
            }
        }
        console.error(
            '\nThis is a batched maintenance event, not a trim-to-fit exercise. '
            + 'Compact/restructure toward targetBytes with substantial headroom. '
            + 'Documents below compactAtBytes are healthy and require no size-only cleanup.',
        );
        process.exitCode = 1;
    }
}
