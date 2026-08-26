#!/usr/bin/env node

import { installMidnightRuntimeCompatibility } from './runtime-compat.js';

installMidnightRuntimeCompatibility();

const { main } = await import('./main.js');
process.exitCode = await main();
