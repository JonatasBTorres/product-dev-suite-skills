#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ALL_SKILLS = [
  'arquiteto-software-senior',
  'backend-engineer',
  'product-manager-tech',
];

const PACKAGE_ROOT = path.join(__dirname, '..');

function parseArgs(argv) {
  const args = argv.slice(2);
  let global = false;
  const skills = [];

  for (const arg of args) {
    if (arg === '--global' || arg === '-g') {
      global = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      skills.push(arg);
    }
  }

  return { global, skills: skills.length ? skills : ALL_SKILLS };
}

function printHelp() {
  console.log(`
Uso: npx product-dev-suite-skills [skills...] [--global]

Skills disponiveis:
  ${ALL_SKILLS.join('\n  ')}

Opcoes:
  --global, -g   Instala em ~/.claude/skills (disponivel em todos projetos)
                 Sem essa flag, instala em ./.claude/skills (so este projeto)
  --help, -h     Mostra esta ajuda

Exemplos:
  npx product-dev-suite-skills
  npx product-dev-suite-skills backend-engineer
  npx product-dev-suite-skills --global
`);
}

function main() {
  const { global, skills } = parseArgs(process.argv);

  const invalid = skills.filter((s) => !ALL_SKILLS.includes(s));
  if (invalid.length) {
    console.error(`Skill(s) desconhecida(s): ${invalid.join(', ')}`);
    console.error(`Disponiveis: ${ALL_SKILLS.join(', ')}`);
    process.exit(1);
  }

  const targetBase = global
    ? path.join(os.homedir(), '.claude', 'skills')
    : path.join(process.cwd(), '.claude', 'skills');

  fs.mkdirSync(targetBase, { recursive: true });

  console.log(`Instalando skills em: ${targetBase}\n`);

  for (const skill of skills) {
    const src = path.join(PACKAGE_ROOT, skill);
    const dest = path.join(targetBase, skill);
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`  ok ${skill}`);
  }

  console.log(`\nPronto. ${skills.length} skill(s) instalada(s).`);
  if (!global) {
    console.log('Reinicie o Claude Code no projeto para elas aparecerem.');
  }
}

main();
