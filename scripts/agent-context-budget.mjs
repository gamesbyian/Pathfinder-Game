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
const authorityBudgetPattern = /<!--\s*agent-context-budget:\s*warn=(\d+)\s+max=(\d+)\s*-->/u;

function fileBytes(relativePath) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) return { path: relativePath, exists: false, bytes: 0 };
    return { path: relativePath, exists: true, bytes: fs.statSync(absolute).size };
}

function headroom(bytes, threshold) {
    return threshold - bytes;
}

function summarizeRoute(route) {
    const required = route.required.map(fileBytes);
    const optional = (route.optional ?? []).map(fileBytes);
    const requiredBytes = required.reduce((sum, item) => sum + item.bytes, 0);
    const optionalBytes = optional.reduce((sum, item) => sum + item.bytes, 0);
    const missingRequired = required.filter(item => !item.exists).map(item => item.path);
    const missingOptional = optional.filter(item => !item.exists).map(item => item.path);
    const status = requiredBytes > route.maxBytes ? 'over-max' : requiredBytes > route.warnBytes ? 'warning' : 'ok';
    return {
        id: route.id,
        description: route.description,
        status,
        requiredBytes,
        optionalBytes,
        warnBytes: route.warnBytes,
        maxBytes: route.maxBytes,
        warningHeadroomBytes: headroom(requiredBytes, route.warnBytes),
        maxHeadroomBytes: headroom(requiredBytes, route.maxBytes),
        missingRequired,
        missingOptional,
        required,
        optional,
    };
}

function authorityBudget(relativePath) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) return { status: 'missing' };
    const prefix = fs.readFileSync(absolute, 'utf8').slice(0, 4096);
    const match = authorityBudgetPattern.exec(prefix);
    if (!match) return { status: 'missing-declaration' };
    const warnBytes = Number(match[1]);
    const maxBytes = Number(match[2]);
    if (!Number.isSafeInteger(warnBytes) || !Number.isSafeInteger(maxBytes) || warnBytes <= 0 || maxBytes <= warnBytes) {
        return { status: 'invalid-declaration', warnBytes, maxBytes };
    }
    return { status: 'ok', warnBytes, maxBytes };
}

function summarizeAuthority(authority) {
    const file = fileBytes(authority.path);
    const budget = authorityBudget(authority.path);
    let status = budget.status;
    if (status === 'ok') status = file.bytes > budget.maxBytes ? 'over-max' : file.bytes > budget.warnBytes ? 'warning' : 'ok';
    return {
        path: authority.path,
        purpose: authority.purpose,
        status,
        bytes: file.bytes,
        warnBytes: budget.warnBytes ?? null,
        maxBytes: budget.maxBytes ?? null,
        warningHeadroomBytes: budget.warnBytes == null ? null : headroom(file.bytes, budget.warnBytes),
        maxHeadroomBytes: budget.maxBytes == null ? null : headroom(file.bytes, budget.maxBytes),
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
    console.log(JSON.stringify({
        schemaVersion: config.schemaVersion,
        measurement: config.measurement,
        routes,
        authorities,
    }, null, 2));
    if (check && (
        routes.some(route => route.status === 'over-max' || route.missingRequired.length > 0)
        || authorities.some(authority => !['ok', 'warning'].includes(authority.status))
    )) process.exitCode = 1;
}
