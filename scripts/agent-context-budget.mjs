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

function fileBytes(relativePath) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) return { path: relativePath, exists: false, bytes: 0 };
    return { path: relativePath, exists: true, bytes: fs.statSync(absolute).size };
}

function summarize(route) {
    const required = route.required.map(fileBytes);
    const optional = (route.optional ?? []).map(fileBytes);
    const requiredBytes = required.reduce((sum, item) => sum + item.bytes, 0);
    const optionalBytes = optional.reduce((sum, item) => sum + item.bytes, 0);
    const missing = [...required, ...optional].filter(item => !item.exists).map(item => item.path);
    const status = requiredBytes > route.maxBytes ? 'over-max' : requiredBytes > route.warnBytes ? 'warning' : 'ok';
    return {
        id: route.id,
        description: route.description,
        status,
        requiredBytes,
        optionalBytes,
        warnBytes: route.warnBytes,
        maxBytes: route.maxBytes,
        missing,
        required,
        optional,
    };
}

const routes = config.routes
    .filter(route => !selectedRoute || route.id === selectedRoute)
    .map(summarize);

if (selectedRoute && routes.length === 0) {
    console.error(`Unknown route: ${selectedRoute}`);
    process.exitCode = 2;
} else {
    console.log(JSON.stringify({
        schemaVersion: config.schemaVersion,
        measurement: config.measurement,
        routes,
    }, null, 2));
    if (check && routes.some(route => route.status === 'over-max' || route.missing.length > 0)) process.exitCode = 1;
}
