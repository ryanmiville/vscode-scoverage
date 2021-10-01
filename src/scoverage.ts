'use strict';

import fs = require('fs');
import { parseStringPromise } from 'xml2js';
import * as vscode from 'vscode';

export interface Report {
    packages: Package[];
    statementRate: number;
    version: string;
}

export interface Package {
    name: string;
    statementRate: number;
    classes: Class[];
}

export interface Class {
    name: string;
    fileName: string;
    statementRate: number;
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
        statementRate: xml.$['statement-rate'],
        version: xml.$.version,
    };
}

function pack(xml: any): Package[] {
    return xml.package.map((p: any) => {
        return <Package>{
            name: p.$.name,
            statementRate: p.$['statement-rate'],
            classes: flatten(p.classes.map(klass)),
        };
    });
}

function klass(xml: any): Class[] {
    return xml.class.map((c: any) => {
        return <Class>{
            name: c.$.name,
            fileName: c.$.filename,
            statementRate: c.$['statement-rate'],
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
export async function parseReport(scoveragePath: vscode.Uri): Promise<Report> {
    const contents = fs.readFileSync(scoveragePath.fsPath).toString();
    const xml = await parseStringPromise(contents, { explicitRoot: false });
    return report(xml);
}