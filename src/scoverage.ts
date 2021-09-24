/* eslint-disable no-useless-escape */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

'use strict';

import fs = require('fs');
import { parseStringPromise } from 'xml2js';

export interface Report {
    packages: Package[];
}

export interface Package {
    name: string;
    classes: Class[];
}

export interface Class {
    name: string;
    fileName: string;
    methods: Method[];
}

export interface Method {
    name: string;
    statements: Statement[];
}

export interface Statement {
    source: string;
    start: number;
    end: number;
    line: number;
    invocationCount: number;
    ignored: boolean;
}

function report(xml: any): Report {
    return {
        packages: flatten(xml.packages.map(pack)),
    };
}

function pack(xml: any): Package[] {
    return xml.package.map((p: any) => {
        return <Package>{
            name: p.$.name,
            classes: flatten(p.classes.map(klass)),
        };
    });
}

function klass(xml: any): Class[] {
    return xml.class.map((c: any) => {
        return <Class>{
            name: c.$.name,
            fileName: c.$.filename,
            methods: flatten(c.methods.map(method)),
        };
    });
}

function method(xml: any): Method[] {
    return xml.method.map((m: any) => {
        return <Method>{
            name: m.$.name,
            statements: flatten(m.statements.map(statement)),
        };
    }
    );
}

function statement(xml: any): Statement[] {
    return xml.statement.map((s: any) => {
        return <Statement>{
            source: s.$.source,
            start: s.$.start,
            end: s.$.end,
            line: s.$.line,
            invocationCount: s.$['invocation-count'],
            ignored: s.$.ignored,
        };
    });
}

function flatten<T>(arr: T[][]): T[] {
    return arr.reduce((acc, val) => acc.concat(val), []);
}
export async function parseReport(): Promise<Report> {
    const scoveragePath = '/Users/ryanmiville/dev/ce3/target/scala-2.13/scoverage-report/scoverage.xml';
    const contents = fs.readFileSync(scoveragePath).toString();
    const xml = await parseStringPromise(contents, { explicitRoot: false });
    return report(xml);
}