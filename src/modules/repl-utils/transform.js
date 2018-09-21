const history = require('repl.history');
const os = require('os');
const path = require('path');
const historyFile = path.join(os.homedir(), '.async_repl_history');
const babel = require("babel-core")

module.exports = function (repl) {
  const _eval = repl.eval;
  history(repl, historyFile);
  repl.eval = myEval;

  // https://gist.github.com/princejwesley/a66d514d86ea174270210561c44b71ba
  function preprocess(input) {
    const awaitMatcher = /^(?:\s*(?:(?:let|var|const)\s)?\s*([^=]+)=\s*|^\s*)(await\s[\s\S]*)/;
    const asyncWrapper = (code, binder) => {
      let assign = binder ? `global.${binder} = ` : '';
      return `(function(){ async function _wrap() { return ${assign}${code} } return _wrap();})()`;
    };

    // match & transform
    const match = input.match(awaitMatcher);
    if (match) {
      input = `${asyncWrapper(match[2], match[1])}`;
    }
    return input;
  }

  function myEval(cmd, context, filename, callback) {
    const code = babel.transform(preprocess(cmd), {
      presets: ['es2015', 'stage-3'],
      plugins: [
        ["transform-runtime", {
          "regenerator": true
        }]
      ]
    }).code;
    _eval(code, context, filename, callback);
  }
};
