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
function runCommand(command) {
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// Helper function to validate GitHub repository URL
function validateGitHubUrl(url) {
    const githubRegex = /^(https:\/\/github.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)(.git)?$/;
    return githubRegex.test(url);
}

// helper function to run shell commands
function runCommand(command) {
    try {
        const result = execSync(command, { stdio: 'inherit' });
        return result.toString();
    } catch (error) {
        console.error(chalk.red(`❌ Command failed: ${command}`));
        console.error(error.message);
        process.exit(1);  // exit on failure
    }
}

// helper function to validate GitHub URL
function validateGitHubUrl(url) {
    const gitHubUrlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
    return gitHubUrlPattern.test(url);
}

// git repo here (initialize repo)
program.command('git repo here')
    .description('Initialize Git and connect to GitHub')
    .action(() => {
        try {
            execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
            console.log(chalk.yellow('⚠ Git is already initialized.'));
        } catch {
            runCommand('git init');
            console.log(chalk.green('✅ Git has been initialized!'));
        }

        try {
            const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
            console.log(chalk.yellow(`⚠ Remote already exists: ${remoteUrl}`));
        } catch {
            const repoUrl = readlineSync.question('🌍 Enter your GitHub repo URL (or leave blank to skip): ');
            if (repoUrl) {
                if (!validateGitHubUrl(repoUrl)) {
                    console.log(chalk.red('❌ Invalid GitHub repository URL. Please enter a valid URL.'));
                    return;
                }
                runCommand(`git remote add origin ${repoUrl}`);
                console.log(chalk.green(`✅ Connected to GitHub! Remote set to ${repoUrl}`));
            }
        }

        // Check for .env file and warn user
        if (fs.existsSync('.env')) {
            console.log(chalk.yellow('⚠ Warning: Your project contains a .env file, which may contain sensitive information.'));
            const confirm = readlineSync.question(chalk.yellow('Should we add .env to .gitignore? (y/n): '));
            if (confirm.toLowerCase() === 'y') {
                // Check if .gitignore exists, create it if not
                if (!fs.existsSync('.gitignore')) {
                    fs.writeFileSync('.gitignore', '');
                }
                // Add .env to .gitignore
                fs.appendFileSync('.gitignore', '\n.env\n');
                console.log(chalk.green('✅ Added .env to .gitignore.'));
            } else {
                console.log(chalk.red('❌ It is highly recommended to add .env to .gitignore manually.'));
            }
        }

        console.log(chalk.cyan('🎉 Git initialization complete! You can now start committing and pushing to GitHub.'));
        console.log(chalk.cyan('🚀 Next steps:'));
        console.log('1. Make changes to your project files.');
        console.log('2. Stage the changes using `git add .`.');
        console.log('3. Commit the changes using `git commit -m "Your commit message"`.');
        console.log('4. Push to GitHub with `git push origin main` (or replace `main` with your branch name).');
    });

// waka
program.command('get coding time')
    .description('Fetch WakaTime coding stats')
    .action(async () => {
        const wakatimeConfigPath = `${os.homedir()}/.wakatime.cfg`;

        if (!fs.existsSync(wakatimeConfigPath)) {
            console.log(chalk.red('❌ WakaTime config not found. Make sure ~/.wakatime.cfg exists.'));
            return;
        }

        const config = ini.parse(fs.readFileSync(wakatimeConfigPath, 'utf-8'));
        const apiKey = config?.settings?.api_key?.trim();

        if (!apiKey) {
            console.log(chalk.red('❌ API key missing in ~/.wakatime.cfg'));
            return;
        }

        const encodedKey = Buffer.from(`${apiKey}`).toString('base64');
        const url = "https://waka.hackclub.com/api/compat/wakatime/v1/users/current/all_time_since_today";

        console.log(chalk.blue('⌛ Fetching your coding stats...'));

        try {
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Basic ${encodedKey}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                console.log(chalk.red(`❌ API Error: ${response.status} ${response.statusText}`));
                return;
            }

            const data = await response.json();
            console.log(chalk.green('✅ Your coding stats for today:'));
            console.log(`⏳ Time Tracked: ${data.data.text}`);
        } catch (error) {
            console.log(chalk.red(`❌ Failed to fetch data: ${error.message}`));
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

program.command('add task')
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

program.command('remove task')
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

    // is this ai?
    const aiConfigPath = `${os.homedir()}/.helper-ai.cfg`;

function getApiKey() {
    if (fs.existsSync(aiConfigPath)) {
        const config = ini.parse(fs.readFileSync(aiConfigPath, 'utf-8'));
        return config?.settings?.api_key?.trim();
    }
    return null;
}

program.command('ask ai')
    .description('Ask OpenAI a question')
    .action(async () => {
        let apiKey = getApiKey();

        if (!apiKey) {
            apiKey = readlineSync.question('🔑 Enter your OpenAI API Key: ', { hideEchoBack: true });
            if (!apiKey.trim()) {
                console.log(chalk.red('❌ API Key is required.'));
                return;
            }

            const saveKey = readlineSync.question('💾 Save API key for future use? (y/n): ');
            if (saveKey.toLowerCase() === 'y') {
                fs.writeFileSync(aiConfigPath, `[settings]\napi_key=${apiKey}\n`);
                console.log(chalk.green('✅ API key saved.'));
            }
        }

        const userQuestion = readlineSync.question('🤖 What do you want to ask AI?: ');
        if (!userQuestion.trim()) {
            console.log(chalk.red('❌ Question cannot be empty.'));
            return;
        }

        console.log(chalk.blue('⌛ Getting AI response...'));

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

            console.log(chalk.green('🧠 AI says:\n'));
            console.log(response.data.choices[0].message.content);
        } catch (error) {
            console.log(chalk.red(`❌ API Error: ${error.response?.data?.error?.message || error.message}`));
        }
    });

program.parse(process.argv);
