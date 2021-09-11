/* eslint-disable no-useless-escape */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */

'use strict';

import fs = require('fs');
import { parseStringPromise } from 'xml2js';

const reportXml = `<scoverage 
statement-count="4" statements-invoked="1" statement-rate="25.00" branch-rate="100.00" version="1.0" timestamp="1631287991538">
    <packages>
        <package name="com.example" statement-count="4" statements-invoked="1" statement-rate="25.00">
            <classes>
                <class 
                name="com.example.Main" filename="com/example/Main.scala" statement-count="3" statements-invoked="0" statement-rate="0.00" branch-rate="0.00">
                    <methods>
                        <method 
                        name="com.example/Main/run" statement-count="3" statements-invoked="0" statement-rate="0.00" branch-rate="0.00">
                            <statements>
                                <statement 
                                package="com.example" class="Main" class-type="Object" full-class-name="com.example.Main" source="/Users/ryanmiville/dev/ce3/src/main/scala/com/example/Main.scala" method="run" start="189" end="189" line="10" branch="false" invocation-count="0" ignored="false">
</statement>
                                <statement 
                                package="com.example" class="Main" class-type="Object" full-class-name="com.example.Main" source="/Users/ryanmiville/dev/ce3/src/main/scala/com/example/Main.scala" method="run" start="161" end="197" line="10" branch="false" invocation-count="0" ignored="false">
</statement>
                                <statement 
                                package="com.example" class="Main" class-type="Object" full-class-name="com.example.Main" source="/Users/ryanmiville/dev/ce3/src/main/scala/com/example/Main.scala" method="run" start="186" end="196" line="10" branch="false" invocation-count="0" ignored="false">
</statement>
                            </statements>
</method>
                    </methods>
</class>
                <class 
                name="com.example.HelloWorld" filename="com/example/HelloWorld.scala" statement-count="1" statements-invoked="1" statement-rate="100.00" branch-rate="100.00">
                    <methods>
                        <method 
                        name="com.example/HelloWorld/say" statement-count="1" statements-invoked="1" statement-rate="100.00" branch-rate="100.00">
                            <statements>
                                <statement 
                                package="com.example" class="HelloWorld" class-type="Object" full-class-name="com.example.HelloWorld" source="/Users/ryanmiville/dev/ce3/src/main/scala/com/example/HelloWorld.scala" method="say" start="91" end="114" line="7" branch="false" invocation-count="1" ignored="false">
</statement>
                            </statements>
</method>
                    </methods>
</class>
            </classes>
        </package>
    </packages>
</scoverage>`;

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
    const xml = await parseStringPromise(reportXml, { explicitRoot: false });
    return report(xml);
}