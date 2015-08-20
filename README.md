A JavaScript implementation of an Earley parser
===============================================

This is a straightforward implementation of an Earley parser
[as explained in this Wikipedia article](https://en.wikipedia.org/wiki/Earley_parser)
using the improvement by Aycock and Horspool (2002).

This library also provides:

* BNF and EBNF front-ends for entering grammars.
* Support for the generation of Abstract Syntax Trees (in the EBNF front-end).
* Support for parsers with, or without, scanner. A default non-optimized scanner is provided.


Building
--------

Install `node.js` and the `grunt` CLI.

```
sudo apt-get install nodejs
sudo npm install grunt-cli -g
```

At the root of the source tree, run:

```
npm install
```

Finally, build the project using the following command:

```
grunt
```

Examples
--------

The source code of the examples can be found in the `src/demo/` folder.
After building the project, the executable demos are in `dist/demo/`.

For instance, type the following command to run the scannerless expression evaluator derived from the EBNF grammar
at `src/demo/calc-scannerless/calc.ebnf`:

```
node dist/demo/calc-scannerless/calc.ebnf.js
```

References
----------

* [Earley Parser](https://en.wikipedia.org/wiki/Earley_parser) at Wikipedia.
* [Earley Parsing Explained](http://loup-vaillant.fr/tutorials/earley-parsing/) by [Loup Vaillant](http://loup-vaillant.fr/).


Disclaimer
----------

The author develops this parser for his own enlightenment.
He shares the source code in the hope that others can learn from it or give useful feedback.
