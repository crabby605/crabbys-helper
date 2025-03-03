#!/usr/bin/env node

import chalk from "chalk";
import { execSync } from 'child_process';
import { program } from 'commander';
import readlineSync from 'readline-sync';
import fs from 'fs';
import os from 'os';
import ini from 'ini';

function runCommand(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// git maker
program.command('git here')
    .description('Initialize Git and connect to GitHub')
    .action(() => {
        runCommand('git init');
        console.log(chalk.green('✅ Git has been initialized!'));

        const repoUrl = readlineSync.question('🌍 Enter your GitHub repo URL (or leave blank to skip): ');
        if (repoUrl) {
            runCommand(`git remote add origin ${repoUrl}`);
            console.log(chalk.green('✅ Connected to GitHub!'));
        }
    });

// git file adder
program.command('git add')
    .description('Choose which files to add to Git')
    .action(() => {
        const files = fs.readdirSync('.').filter(file => fs.lstatSync(file).isFile());

        if (files.length === 0) {
            console.log(chalk.yellow('⚠ No files found to add.'));
            return;
        }

        console.log(chalk.blue('📂 Select files to add (comma-separated or type "all"):'));
        files.forEach((file, index) => console.log(`${index + 1}) ${file}`));

        let fileInput = readlineSync.question('Files: ');
        let selectedFiles = [];

        if (fileInput.toLowerCase() === 'all') {
            selectedFiles = files;
        } else {
            const indices = fileInput.split(',').map(i => parseInt(i.trim(), 10) - 1);
            selectedFiles = indices.map(i => files[i]).filter(f => f);
        }

        if (selectedFiles.length === 0) {
            console.log(chalk.red('❌ No valid files selected.'));
            return;
        }

        // warn on .env
        if (selectedFiles.includes('.env')) {
            const confirm = readlineSync.question(chalk.yellow('⚠ Warning: .env contains sensitive info. Remove it? (y/n): '));
            if (confirm.toLowerCase() === 'y') {
                selectedFiles = selectedFiles.filter(f => f !== '.env');
            }
        }

        runCommand(`git add ${selectedFiles.join(' ')}`);
        console.log(chalk.green(`✅ Added: ${selectedFiles.join(', ')}`));
    });

// commiter
program.command('git commit')
    .description('Commit changes with a custom message')
    .action(() => {
        const commitMessage = readlineSync.question('📝 Enter commit message: ');
        if (!commitMessage.trim()) {
            console.log(chalk.red('❌ Commit message cannot be empty.'));
            return;
        }
        runCommand(`git commit -m "${commitMessage}"`);
        console.log(chalk.green(`✅ Changes committed: "${commitMessage}"`));
    });

// push
program.command('git push')
    .description('Push changes to GitHub')
    .action(() => {
        runCommand('git push -u origin main');
        console.log(chalk.green('🚀 Changes pushed to GitHub!'));
    });

// waka
program.command('get time')
    .description('Fetch WakaTime coding stats')
    .action(() => {
        const wakatimeConfigPath = `${os.homedir()}/.wakatime.cfg`;

        if (!fs.existsSync(wakatimeConfigPath)) {
            console.log(chalk.red('❌ WakaTime config not found. Make sure ~/.wakatime.cfg exists.'));
            return;
        }

        const config = ini.parse(fs.readFileSync(wakatimeConfigPath, 'utf-8'));
        const apiKey = config?.settings?.api_key;

        if (!apiKey) {
            console.log(chalk.red('❌ API key missing in ~/.wakatime.cfg'));
            return;
        }

        console.log(chalk.blue('⌛ Fetching your coding stats...'));
        runCommand(`curl -s -H "Authorization: Basic $(echo -n ${apiKey} | base64)" "https://wakatime.com/api/v1/users/current/summaries?range=last_7_days"`);
    });

// todo list
const tasksFile = `${os.homedir()}/.helper-tasks.json`;

function loadTasks() {
    if (!fs.existsSync(tasksFile)) return [];
    return JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
}

function saveTasks(tasks) {
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
}

program.command('tasks')
    .description('View all tasks')
    .action(() => {
        const tasks = loadTasks();
        if (tasks.length === 0) {
            console.log(chalk.yellow('📋 No tasks found.'));
        } else {
            console.log(chalk.blue('📌 Your Tasks:'));
            tasks.forEach((task, index) => console.log(`${index + 1}) ${task}`));
        }
    });

program.command('add-task')
    .description('Add a new task')
    .action(() => {
        const task = readlineSync.question('📝 Enter task: ');
        if (!task.trim()) {
            console.log(chalk.red('❌ Task cannot be empty.'));
            return;
        }
        const tasks = loadTasks();
        tasks.push(task);
        saveTasks(tasks);
        console.log(chalk.green(`✅ Task added: "${task}"`));
    });

program.command('remove-task')
    .description('Remove a task')
    .action(() => {
        const tasks = loadTasks();
        if (tasks.length === 0) {
            console.log(chalk.yellow('❌ No tasks to remove.'));
            return;
        }

        console.log(chalk.blue('📌 Your Tasks:'));
        tasks.forEach((task, index) => console.log(`${index + 1}) ${task}`));

        const taskIndex = parseInt(readlineSync.question('Enter task number to remove: '), 10) - 1;

        if (taskIndex < 0 || taskIndex >= tasks.length) {
            console.log(chalk.red('❌ Invalid selection.'));
            return;
        }

        const removedTask = tasks.splice(taskIndex, 1);
        saveTasks(tasks);
        console.log(chalk.green(`✅ Removed task: "${removedTask}"`));
    });

program.parse(process.argv);
