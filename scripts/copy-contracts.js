// This script copies Solidity contract ABI files to the dist directory

const shell = require('shelljs')
const os = require('os')
const path = require('path')

shell.mkdir('-p', './dist/ABI')
shell.cp('./src/ABI/*.json', './dist/ABI/')
