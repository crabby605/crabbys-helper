#!/usr/bin/env node

import chalk from "chalk";
import { execSync } from 'child_process';
import { program } from 'commander';
import readlineSync from 'readline-sync';
import fs from 'fs';
import os from 'os';
import ini from 'ini';
import fetch from 'node-fetch';
import axios from 'axios';

// helper function to run shell commands
function runCommand(command) {
    try {
        const result = execSync(command, { stdio: 'pipe' });  // changed to 'pipe' to capture output
        return result.toString();  // ensure result is converted to string
    } catch (error) {
        console.error(chalk.red(`❌ command failed: ${command}`));
        console.error(error.message);
        return null;  // return null explicitly
    }
}
function validateGitHubUrl(url) {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\.git)?$/;
    return githubRegex.test(url);
}

program.command('git here')
    .description('Initialize Git and connect to GitHub')
    .action(() => {
        try {
            execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        } catch {
            runCommand('git init');
            console.log(chalk.green('✅ Git has been initialized!'));
        }

        let remoteUrl;
        try {
            remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
        } catch {
            let repoUrl = readlineSync.question('🌍 Enter your GitHub repo URL (or leave blank to skip): ');

            if (repoUrl) {
                if (!validateGitHubUrl(repoUrl)) {
                    console.log(chalk.red('❌ Invalid GitHub repository URL. Please enter a valid URL.'));
                    return;
                }

                runCommand(`git remote add origin ${repoUrl}`);
                console.log(chalk.green('✅ Connected to GitHub!'));
            }
        }

        console.log(chalk.cyan('🎉 Git initialization complete! You can now start committing and pushing to GitHub.'));
        console.log(chalk.cyan('🚀 Next steps:'));
        console.log('1. Make changes to your project files.');
        console.log('2. Stage the changes using `git add .`.');
        console.log('3. Commit the changes using `git commit -m "your commit message"`.');
        console.log('4. Push to GitHub with `git push origin main` (or replace `main` with your branch name).');
        console.log(chalk.red('⚠ NEVER COMMIT YOUR .ENV FILES!!'));
    });


// waka
program.command('get coding time')
    .description('fetch wakatime coding stats')
    .action(async () => {
        const wakatimeConfigPath = `${os.homedir()}/.wakatime.cfg`;

        if (!fs.existsSync(wakatimeConfigPath)) {
            console.log(chalk.red('❌ wakatime config not found. make sure ~/.wakatime.cfg exists.'));
            return;
        }

        const config = ini.parse(fs.readFileSync(wakatimeConfigPath, 'utf-8'));
        const apiKey = config?.settings?.api_key?.trim();

        if (!apiKey) {
            console.log(chalk.red('❌ api key missing in ~/.wakatime.cfg'));
            return;
        }

        const encodedKey = Buffer.from(`${apiKey}`).toString('base64');
        const url = "https://waka.hackclub.com/api/compat/wakatime/v1/users/current/all_time_since_today";

        console.log(chalk.blue('⌛ fetching your coding stats...'));

        try {
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Basic ${encodedKey}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                console.log(chalk.red(`❌ api error: ${response.status} ${response.statusText}`));
                return;
            }

            const data = await response.json();
            console.log(chalk.green('✅ your coding stats for today:'));
            console.log(`⏳ time tracked: ${data.data.text}`);
        } catch (error) {
            console.log(chalk.red(`❌ failed to fetch data: ${error.message}`));
        }
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

program.command('task list')
    .description('view all tasks')
    .action(() => {
        const tasks = loadTasks();
        if (tasks.length === 0) {
            console.log(chalk.yellow('📋 no tasks found.'));
        } else {
            console.log(chalk.blue('📌 your tasks:'));
            tasks.forEach((task, index) => console.log(`${index + 1}) ${task}`));
        }
    });

program.command('add task')
    .description('add a new task')
    .action(() => {
        const task = readlineSync.question('📝 enter task: ');
        if (!task.trim()) {
            console.log(chalk.red('❌ task cannot be empty.'));
            return;
        }
        const tasks = loadTasks();
        tasks.push(task);
        saveTasks(tasks);
        console.log(chalk.green(`✅ task added: "${task}"`));
    });

program.command('remove task')
    .description('remove a task')
    .action(() => {
        const tasks = loadTasks();
        if (tasks.length === 0) {
            console.log(chalk.yellow('❌ no tasks to remove.'));
            return;
        }

        console.log(chalk.blue('📌 your tasks:'));
        tasks.forEach((task, index) => console.log(`${index + 1}) ${task}`));

        const taskIndex = parseInt(readlineSync.question('enter task number to remove: '), 10) - 1;

        if (taskIndex < 0 || taskIndex >= tasks.length) {
            console.log(chalk.red('❌ invalid selection.'));
            return;
        }

        const removedTask = tasks.splice(taskIndex, 1);
        saveTasks(tasks);
        console.log(chalk.green(`✅ removed task: "${removedTask}"`));
    });

// ai stuff
const aiConfigPath = `${os.homedir()}/.helper-ai.cfg`;

function getApiKey() {
    if (fs.existsSync(aiConfigPath)) {
        const config = ini.parse(fs.readFileSync(aiConfigPath, 'utf-8'));
        return config?.settings?.api_key?.trim();
    }
    return null;
}

program.command('ask ai')
    .description('ask openai a question')
    .action(async () => {
        let apiKey = getApiKey();

        if (!apiKey) {
            apiKey = readlineSync.question('🔑 enter your openai api key: ', { hideEchoBack: true });
            if (!apiKey.trim()) {
                console.log(chalk.red('❌ api key is required.'));
                return;
            }

            const saveKey = readlineSync.question('💾 save api key for future use? (y/n): ');
            if (saveKey.toLowerCase() === 'y') {
                fs.writeFileSync(aiConfigPath, `[settings]\napi_key=${apiKey}\n`);
                console.log(chalk.green('✅ api key saved.'));
            }
        }

        const userQuestion = readlineSync.question('🤖 what do you want to ask ai?: ');
        if (!userQuestion.trim()) {
            console.log(chalk.red('❌ question cannot be empty.'));
            return;
        }

        console.log(chalk.blue('⌛ getting ai response...'));

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [{ role: 'user', content: userQuestion }]
                },
                {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                }
            );

            console.log(chalk.green('🧠 ai says:\n'));
            console.log(response.data.choices[0].message.content);
        } catch (error) {
            console.log(chalk.red(`❌ api error: ${error.response?.data?.error?.message || error.message}`));
        }
    });

program.parse(process.argv);
