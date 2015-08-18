
import * as persil from "../..";
import fs from "fs";

const args = process.argv.slice(2);

fs.readFile(args[0], {encoding: "utf-8"}, (err, data) => {
    if (err) {
        throw err;
    }
    const res = persil.ebnf.compile(data);
    if (res.error) {
        process.stderr.write(persil.error(data, res) + "\n");
    }
    else {
        process.stdout.write(persil.stringify(res.data));
    }
});
