import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function walk(root, relative, out = []) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) return out;
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
        for (const name of readdirSync(absolute).sort()) walk(root, path.join(relative, name), out);
    } else if (path.basename(relative) === 'manifest.json') {
        out.push(relative.split(path.sep).join('/'));
    }
    return out;
}

function typeMatches(value, type) {
    if (type === 'null') return value === null;
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === type;
}

export function declaredShapeIssues(schema, value, at = '$') {
    const issues = [];
    if (!schema || typeof schema !== 'object') return issues;
    if ('$ref' in schema) return issues;
    if ('const' in schema && value !== schema.const) issues.push(`${at}: expected const ${JSON.stringify(schema.const)}`);
    if (schema.type) {
        const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!allowed.some(type => typeMatches(value, type))) {
            issues.push(`${at}: expected type ${allowed.join('|')}`);
            return issues;
        }
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && schema.properties) {
        for (const required of schema.required ?? []) {
            if (!(required in value)) issues.push(`${at}.${required}: missing required property`);
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(value)) {
                if (!(key in schema.properties)) issues.push(`${at}.${key}: property is emitted but forbidden by declared schema`);
            }
        }
        for (const [key, child] of Object.entries(value)) {
            if (key in schema.properties) issues.push(...declaredShapeIssues(schema.properties[key], child, `${at}.${key}`));
        }
    }
    if (Array.isArray(value) && schema.items) {
        value.forEach((child, index) => issues.push(...declaredShapeIssues(schema.items, child, `${at}[${index}]`)));
    }
    return issues;
}

export function auditExperimentResultDeclaredShape(root = process.cwd()) {
    const schemaPath = 'docs/solver-experiment-result.schema.json';
    const schema = JSON.parse(readFileSync(path.join(root, schemaPath), 'utf8'));
    const manifests = walk(root, 'reports/stress/experiment-evidence');
    const results = [];
    for (const manifestPath of manifests) {
        const document = JSON.parse(readFileSync(path.join(root, manifestPath), 'utf8'));
        if (document?.schemaVersion !== 3 || document?.kind !== 'pathfinder-solver-experiment-result') continue;
        const issues = declaredShapeIssues(schema, document);
        results.push({ manifestPath, issueCount: issues.length, issues });
    }
    return {
        schemaVersion: 1,
        declaredSchema: schemaPath,
        artifactCount: results.length,
        mismatchCount: results.filter(row => row.issueCount > 0).length,
        results,
    };
}
