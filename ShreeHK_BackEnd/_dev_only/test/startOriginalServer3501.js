const path = require('path');
const Module = require('module');

// Ensure node_modules resolves from main workspace
const nodeModulesPath = path.resolve(__dirname, '../node_modules');
const origNodeModulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function(from) {
  const paths = origNodeModulePaths.call(this, from);
  if (!paths.includes(nodeModulesPath)) {
    paths.push(nodeModulesPath);
  }
  return paths;
};

process.env.PORT = '3501';
process.chdir(path.resolve(__dirname, '../../../shreehk-original-worktree/ShreeHK_BackEnd'));
require(path.resolve(__dirname, '../../../shreehk-original-worktree/ShreeHK_BackEnd/index.js'));

