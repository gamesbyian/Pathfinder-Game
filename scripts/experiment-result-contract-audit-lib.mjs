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

function resolveLocalRef(rootSchema, ref) {
    if (!ref.startsWith('#/')) return null;
    let node = rootSchema;
    for (const token of ref.slice(2).split('/')) {
        const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
        node = node?.[key];
        if (node == null) return null;
    }
    return node;
}

function stableValue(value) {
    if (Array.isArray(value)) return JSON.stringify(value.map(stableValue));
    if (value && typeof value === 'object') {
        return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
            .map(([key, child]) => [key, stableValue(child)])));
    }
    return JSON.stringify(value);
}

export function declaredShapeIssues(schema, value, at = '$', rootSchema = schema) {
    const issues = [];
    if (!schema || typeof schema !== 'object') return issues;

    if ('$ref' in schema) {
        const resolved = resolveLocalRef(rootSchema, schema.$ref);
        if (!resolved) return [`${at}: unresolved local schema ref ${schema.$ref}`];
        return declaredShapeIssues(resolved, value, at, rootSchema);
    }

    if (Array.isArray(schema.anyOf)) {
        const alternatives = schema.anyOf.map(candidate => declaredShapeIssues(candidate, value, at, rootSchema));
        if (alternatives.some(candidateIssues => candidateIssues.length === 0)) return [];
        issues.push(`${at}: value matches no anyOf alternative`);
        return issues;
    }

    if ('const' in schema && value !== schema.const) issues.push(`${at}: expected const ${JSON.stringify(schema.const)}`);
    if (Array.isArray(schema.enum) && !schema.enum.some(candidate => candidate === value)) {
        issues.push(`${at}: value is outside declared enum`);
    }
    if (schema.type) {
        const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
        if (!allowed.some(type => typeMatches(value, type))) {
            issues.push(`${at}: expected type ${allowed.join('|')}`);
            return issues;
        }
    }
    if (typeof value === 'number' && Number.isFinite(schema.minimum) && value < schema.minimum) {
        issues.push(`${at}: value is below minimum ${schema.minimum}`);
    }
    if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
        issues.push(`${at}: value does not match declared pattern`);
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const required of schema.required ?? []) {
            if (!(required in value)) issues.push(`${at}.${required}: missing required property`);
        }
        const properties = schema.properties ?? {};
        for (const [key, child] of Object.entries(value)) {
            if (key in properties) {
                issues.push(...declaredShapeIssues(properties[key], child, `${at}.${key}`, rootSchema));
            } else if (schema.additionalProperties === false) {
                issues.push(`${at}.${key}: property is emitted but forbidden by declared schema`);
            } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
                issues.push(...declaredShapeIssues(schema.additionalProperties, child, `${at}.${key}`, rootSchema));
            }
        }
    }
    if (Array.isArray(value)) {
        if (schema.uniqueItems === true) {
            const encoded = value.map(stableValue);
            if (new Set(encoded).size !== encoded.length) issues.push(`${at}: array items are not unique`);
        }
        if (schema.items) {
            value.forEach((child, index) =>
                issues.push(...declaredShapeIssues(schema.items, child, `${at}[${index}]`, rootSchema)));
        }
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
        const issues = declaredShapeIssues(schema, document, '
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
, schema);
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
