
import {compile} from "../lib/bnf";
import {stringify} from "../lib/persil";
import {error} from "../lib/logging";
import fs from "fs";

const args = process.argv.slice(2);

fs.readFile(args[0], {encoding: "utf-8"}, (err, data) => {
    if (err) {
        throw err;
    }
    const res = compile(data);
    if (res.error) {
        error(data, res);
    }
    console.log(stringify(res.data));
});
