document.addEventListener('DOMContentLoaded', () => {
  const terminal = document.getElementById('terminal');
  const cmdInput = document.getElementById('cmd');
  const form = document.getElementById('form');
  let commandHistory = [];
  let historyIndex = -1;
  let pingInterval = null;
  let currentColor = '#00ff00'; // Couleur par défaut (vert comme Terminal macOS)

  // Mettre à jour la variable CSS root pour la couleur actuelle
  document.documentElement.style.setProperty('--current-color', currentColor);

  // Simulated environment variables
  let envVars = {
    PATH: '/bin:/usr/bin',
    HOME: '/home/user'
  };

  // Simulated processes
  let processes = [
    { pid: 1234, user: 'user', command: 'bash' },
    { pid: 5678, user: 'user', command: 'node server.js' }
  ];

  // Simulated file system with permissions
  let fileSystem = {
    '/': {
      type: 'dir',
      permissions: 'rwxr-xr-x',
      owner: 'user',
      group: 'user',
      content: {
        'bin': {
          type: 'dir',
          permissions: 'rwxr-xr-x',
          owner: 'user',
          group: 'user',
          content: {
            'ls': { type: 'file', permissions: 'rwxr-xr-x', owner: 'user', group: 'user', content: '' },
            'cat': { type: 'file', permissions: 'rwxr-xr-x', owner: 'user', group: 'user', content: '' }
          }
        },
        'home': {
          type: 'dir',
          permissions: 'rwxr-xr-x',
          owner: 'user',
          group: 'user',
          content: {
            'user': {
              type: 'dir',
              permissions: 'rwxr-xr-x',
              owner: 'user',
              group: 'user',
              content: {
                'documents': {
                  type: 'dir',
                  permissions: 'rwxr-xr-x',
                  owner: 'user',
                  group: 'user',
                  content: {}
                },
                'downloads': {
                  type: 'dir',
                  permissions: 'rwxr-xr-x',
                  owner: 'user',
                  group: 'user',
                  content: {}
                },
                'readme.txt': {
                  type: 'file',
                  permissions: 'rw-r--r--',
                  owner: 'user',
                  group: 'user',
                  content: 'Welcome to the Web Terminal!\nType `help` to see available commands.'
                }
              }
            }
          }
        }
      }
    }
  };
  let currentPath = '/home/user';

  // Utility functions
  function appendToTerminal(text) {
    const div = document.createElement('div');
    div.textContent = text;
    if (!text.startsWith('$')) div.classList.add('color-changed'); // Applique la couleur aux sorties
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function getCurrentDir() {
    let dir = fileSystem;
    const pathParts = currentPath.split('/').filter(p => p);
    for (const part of pathParts) {
      dir = dir.content ? dir.content[part] : {};
    }
    return dir.content || {};
  }

  function resolvePath(path) {
    if (!path) return currentPath;
    let newPath = path.startsWith('/') ? path : `${currentPath}/${path}`;
    newPath = newPath.replace(/\/+/g, '/').replace(/\/$/, '');
    if (newPath === '') newPath = '/';
    return newPath;
  }

  function getDirAtPath(path) {
    let dir = fileSystem;
    const parts = resolvePath(path).split('/').filter(p => p);
    for (const part of parts) {
      if (!dir.content || !dir.content[part]) return null;
      dir = dir.content[part];
    }
    return dir;
  }

  function parseChmod(mode, currentPerms) {
    if (/^[0-7]{3}$/.test(mode)) {
      const octal = parseInt(mode, 8);
      const perms = ['---', '---', '---'];
      perms[0] = ((octal & 0o400) ? 'r' : '-') + ((octal & 0o200) ? 'w' : '-') + ((octal & 0o100) ? 'x' : '-');
      perms[1] = ((octal & 0o040) ? 'r' : '-') + ((octal & 0o020) ? 'w' : '-') + ((octal & 0o010) ? 'x' : '-');
      perms[2] = ((octal & 0o004) ? 'r' : '-') + ((octal & 0o002) ? 'w' : '-') + ((octal & 0o001) ? 'x' : '-');
      return perms.join('');
    } else if (/^[ugoa]*[+-=][rwx]+$/.test(mode)) {
      let perms = currentPerms.split('');
      const who = mode.match(/^[ugoa]*/)[0] || 'a';
      const op = mode.match(/[+-=]/)[0];
      const rights = mode.match(/[rwx]+$/)[0].split('');

      const roles = who === 'a' ? [0, 3, 6] : who.split('').map(c => ({
        u: 0,
        g: 3,
        o: 6
      }[c])).filter(Boolean);

      rights.forEach(right => {
        roles.forEach(start => {
          const idx = start + { r: 0, w: 1, x: 2 }[right];
          if (op === '+') perms[idx] = right;
          else if (op === '-') perms[idx] = '-';
          else if (op === '=') perms[idx] = right;
        });
      });
      return perms.join('');
    }
    return null;
  }

  function simulatePing(hostname, count = 4, continuous = false) {
    if (!hostname) {
      appendToTerminal('ping: missing host operand');
      return;
    }
    appendToTerminal(`PING ${hostname} (127.0.0.1): 56 data bytes`);
    let seq = 1;

    if (continuous) {
      pingInterval = setInterval(() => {
        const time = (Math.random() * 90 + 10).toFixed(1);
        appendToTerminal(`64 bytes from ${hostname}: icmp_seq=${seq++} ttl=64 time=${time} ms`);
      }, 1000);
    } else {
      for (let i = 1; i <= count; i++) {
        const time = (Math.random() * 90 + 10).toFixed(1);
        appendToTerminal(`64 bytes from ${hostname}: icmp_seq=${i} ttl=64 time=${time} ms`);
      }
      appendToTerminal(`--- ${hostname} ping statistics ---`);
      appendToTerminal(`${count} packets transmitted, ${count} packets received, 0% packet loss`);
    }
  }

  function copyFileOrDir(srcPath, destPath) {
    const src = getDirAtPath(srcPath);
    if (!src) return null;
    const destParentPath = destPath.substring(0, destPath.lastIndexOf('/'));
    const destName = destPath.split('/').pop();
    const destParent = getDirAtPath(destParentPath);
    if (!destParent || !destParent.content) return null;

    if (src.type === 'file') {
      destParent.content[destName] = { ...src, content: src.content };
    } else if (src.type === 'dir') {
      destParent.content[destName] = { ...src, content: { ...src.content } };
    }
    return destParent.content[destName];
  }

  function calculateDirSize(dir, path) {
    let size = 0;
    Object.keys(dir.content).forEach(item => {
      const node = dir.content[item];
      if (node.type === 'file') {
        size += node.content.length;
      } else if (node.type === 'dir') {
        size += calculateDirSize(node, `${path}/${item}`);
      }
    });
    return size;
  }

  // Command processing
  function processCommand(command) {
    command = command.trim();
    if (command === '') return;

    appendToTerminal(`$ ${command}`);
    const parts = command.split(/\s+/);
    let cmd = parts[0].toLowerCase();
    let args = parts.slice(1);

    // Handle echo with redirection
    if (cmd === 'echo' && args.includes('>')) {
      const redirectIndex = args.indexOf('>');
      const text = args.slice(0, redirectIndex).join(' ');
      const filePath = resolvePath(args[redirectIndex + 1]);
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
      const fileName = filePath.split('/').pop();
      const parentDir = getDirAtPath(parentPath);
      if (!parentDir) {
        appendToTerminal(`echo: cannot write to '${args[redirectIndex + 1]}': No such file or directory`);
        return;
      }
      parentDir.content[fileName] = {
        type: 'file',
        permissions: 'rw-r--r--',
        owner: 'user',
        group: 'user',
        content: text
      };
      return;
    }

    switch (cmd) {
      case 'help':
        appendToTerminal('Available commands:');
        appendToTerminal('  cat <file>           - Display file contents');
        appendToTerminal('  cd <dir>             - Change directory');
        appendToTerminal('  chmod <mode> <path>  - Change file/directory permissions');
        appendToTerminal('  clear                - Clear the terminal');
        appendToTerminal('  cp <src> <dest>      - Copy file or directory');
        appendToTerminal('  date                 - Show current date and time');
        appendToTerminal('  df [-h]              - Show disk usage');
        appendToTerminal('  du [-sh] <path>      - Show file/directory size');
        appendToTerminal('  echo <text> [> file] - Print text or write to file');
        appendToTerminal('  env [var=value]      - Show or set environment variables');
        appendToTerminal('  find <path> -name <pattern> - Search for files');
        appendToTerminal('  grep <pattern> <file> - Search text in file');
        appendToTerminal('  head <file>          - Show first 10 lines of file');
        appendToTerminal('  history              - Show command history');
        appendToTerminal('  kill <pid>           - Terminate a process');
        appendToTerminal('  ln -s <src> <link>   - Create symbolic link');
        appendToTerminal('  ls [-l]              - List directory contents');
        appendToTerminal('  man <command>        - Show manual for command');
        appendToTerminal('  mkdir <dir>          - Create a new directory');
        appendToTerminal('  mv <src> <dest>      - Move or rename file/directory');
        appendToTerminal('  ping [-c count | -t] <host> - Ping a host (continuous with -t)');
        appendToTerminal('  ps                   - List processes');
        appendToTerminal('  pwd                  - Print working directory');
        appendToTerminal('  rm <file/dir>        - Remove a file or directory');
        appendToTerminal('  tail <file>          - Show last 10 lines of file');
        appendToTerminal('  tar -cf <archive> <files> | -xf <archive> - Create/extract tar archive');
        appendToTerminal('  wc <file>            - Count lines, words, characters');
        appendToTerminal('  which <command>      - Show command path');
        appendToTerminal('  who                  - Show logged-in users');
        appendToTerminal('  whoami               - Display current user');
        appendToTerminal('  color #RRGGBB        - Change terminal output color');
        break;

      case 'clear':
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
          appendToTerminal('^C');
        }
        terminal.innerHTML = '';
        break;

      case 'date':
        const now = new Date();
        appendToTerminal(now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));
        break;

      case 'echo':
        appendToTerminal(args.join(' '));
        break;

      case 'pwd':
        appendToTerminal(currentPath);
        break;

      case 'ls':
        const currentDir = getCurrentDir();
        if (args[0] === '-l') {
          Object.keys(currentDir).sort().forEach(item => {
            const { type, permissions, owner, group } = currentDir[item];
            appendToTerminal(`${type === 'dir' ? 'd' : type === 'link' ? 'l' : '-'} ${permissions} ${owner} ${group} ${item}`);
          });
        } else {
          const items = Object.keys(currentDir).sort().join('  ');
          appendToTerminal(items || '');
        }
        break;

      case 'cd':
        const targetPath = resolvePath(args[0] || '/home/user');
        const targetDir = getDirAtPath(targetPath);
        if (targetDir && targetDir.type === 'dir') {
          currentPath = targetPath;
        } else {
          appendToTerminal(`cd: ${args[0] || '.'}: No such directory`);
        }
        break;

      case 'mkdir':
        if (!args[0]) {
          appendToTerminal('mkdir: missing operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const dirName = filePath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!parentDir) {
            appendToTerminal(`mkdir: cannot create directory '${args[0]}': No such file or directory`);
          } else if (parentDir.content[dirName]) {
            appendToTerminal(`mkdir: cannot create directory '${args[0]}': File exists`);
          } else {
            parentDir.content[dirName] = {
              type: 'dir',
              permissions: 'rwxr-xr-x',
              owner: 'user',
              group: 'user',
              content: {}
            };
          }
        }
        break;

      case 'cat':
        if (!args[0]) {
          appendToTerminal('cat: missing operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const fileDir = getDirAtPath(parentPath);
          if (!fileDir || !fileDir.content[fileName] || fileDir.content[fileName].type !== 'file') {
            appendToTerminal(`cat: ${args[0]}: No such file or directory`);
          } else {
            appendToTerminal(fileDir.content[fileName].content);
          }
        }
        break;

      case 'rm':
        if (!args[0]) {
          appendToTerminal('rm: missing operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!parentDir || !parentDir.content[fileName]) {
            appendToTerminal(`rm: cannot remove '${args[0]}': No such file or directory`);
          } else {
            delete parentDir.content[fileName];
          }
        }
        break;

      case 'touch':
        if (!args[0]) {
          appendToTerminal('touch: missing operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!parentDir) {
            appendToTerminal(`touch: cannot create file '${args[0]}': No such file or directory`);
          } else if (parentDir.content[fileName] && parentDir.content[fileName].type === 'dir') {
            appendToTerminal(`touch: cannot create file '${args[0]}': Is a directory`);
          } else {
            parentDir.content[fileName] = {
              type: 'file',
              permissions: 'rw-r--r--',
              owner: 'user',
              group: 'user',
              content: ''
            };
          }
        }
        break;

      case 'chmod':
        if (args.length < 2) {
          appendToTerminal('chmod: missing operand');
          return;
        }
        {
          const mode = args[0];
          const filePath = resolvePath(args[1]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!parentDir || !parentDir.content[fileName]) {
            appendToTerminal(`chmod: ${args[1]}: No such file or directory`);
            return;
          }
          const newPerms = parseChmod(mode, parentDir.content[fileName].permissions);
          if (!newPerms) {
            appendToTerminal(`chmod: invalid mode: '${mode}'`);
            return;
          }
          parentDir.content[fileName].permissions = newPerms;
        }
        break;

      case 'ping':
        {
          let count = 4;
          let hostname = args[0];
          let continuous = false;
          if (args[0] === '-c' && args[1]) {
            count = parseInt(args[1], 10);
            hostname = args[2];
            if (isNaN(count) || count < 1) {
              appendToTerminal('ping: invalid count');
              return;
            }
          } else if (args[0] === '-t') {
            continuous = true;
            hostname = args[1];
          }
          if (pingInterval) {
            appendToTerminal('ping: another ping is already running');
            return;
          }
          simulatePing(hostname, count, continuous);
        }
        break;

      case 'cp':
        if (args.length < 2) {
          appendToTerminal('cp: missing file operand');
          return;
        }
        {
          const srcPath = resolvePath(args[0]);
          const destPath = resolvePath(args[1]);
          if (!copyFileOrDir(srcPath, destPath)) {
            appendToTerminal(`cp: cannot copy '${args[0]}' to '${args[1]}': No such file or directory`);
          }
        }
        break;

      case 'mv':
        if (args.length < 2) {
          appendToTerminal('mv: missing file operand');
          return;
        }
        {
          const srcPath = resolvePath(args[0]);
          const destPath = resolvePath(args[1]);
          const src = getDirAtPath(srcPath);
          const destParentPath = destPath.substring(0, destPath.lastIndexOf('/'));
          const destName = destPath.split('/').pop();
          const destParent = getDirAtPath(destParentPath);
          if (!src || !destParent) {
            appendToTerminal(`mv: cannot move '${args[0]}' to '${args[1]}': No such file or directory`);
            return;
          }
          destParent.content[destName] = src;
          const srcParentPath = srcPath.substring(0, srcPath.lastIndexOf('/'));
          const srcName = srcPath.split('/').pop();
          const srcParent = getDirAtPath(srcParentPath);
          delete srcParent.content[srcName];
        }
        break;

      case 'ln':
        if (args[0] !== '-s' || args.length < 3) {
          appendToTerminal('ln: missing operand or invalid syntax, use ln -s <src> <link>');
          return;
        }
        {
          const srcPath = resolvePath(args[1]);
          const linkPath = resolvePath(args[2]);
          const src = getDirAtPath(srcPath);
          const parentPath = linkPath.substring(0, linkPath.lastIndexOf('/'));
          const linkName = linkPath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!src || !parentDir) {
            appendToTerminal(`ln: cannot create link '${args[2]}' to '${args[1]}': No such file or directory`);
            return;
          }
          parentDir.content[linkName] = {
            type: 'link',
            permissions: 'rwxr-xr-x',
            owner: 'user',
            group: 'user',
            target: srcPath
          };
        }
        break;

      case 'grep':
        if (args.length < 2) {
          appendToTerminal('grep: missing pattern or file');
          return;
        }
        {
          const pattern = args[0];
          const filePath = resolvePath(args[1]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const fileDir = getDirAtPath(parentPath);
          if (!fileDir || !fileDir.content[fileName] || fileDir.content[fileName].type !== 'file') {
            appendToTerminal(`grep: ${args[1]}: No such file or directory`);
            return;
          }
          const content = fileDir.content[fileName].content.split('\n');
          const regex = new RegExp(pattern, 'i');
          content.forEach(line => {
            if (regex.test(line)) appendToTerminal(line);
          });
        }
        break;

      case 'find':
        if (args.length < 3 || args[1] !== '-name') {
          appendToTerminal('find: invalid syntax, use find <path> -name <pattern>');
          return;
        }
        {
          const searchPath = resolvePath(args[0]);
          const pattern = args[2].replace(/[*]/g, '.*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          const dir = getDirAtPath(searchPath);
          if (!dir) {
            appendToTerminal(`find: ${args[0]}: No such file or directory`);
            return;
          }
          function searchDir(currentDir, currentPath) {
            Object.keys(currentDir.content).forEach(item => {
              if (regex.test(item)) {
                appendToTerminal(`${currentPath}/${item}`);
              }
              if (currentDir.content[item].type === 'dir') {
                searchDir(currentDir.content[item], `${currentPath}/${item}`);
              }
            });
          }
          searchDir(dir, searchPath);
        }
        break;

      case 'wc':
        if (!args[0]) {
          appendToTerminal('wc: missing file operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const fileDir = getDirAtPath(parentPath);
          if (!fileDir || !fileDir.content[fileName] || fileDir.content[fileName].type !== 'file') {
            appendToTerminal(`wc: ${args[0]}: No such file or directory`);
            return;
          }
          const content = fileDir.content[fileName].content;
          const lines = content.split('\n').length;
          const words = content.split(/\s+/).filter(w => w).length;
          const chars = content.length;
          appendToTerminal(`  ${lines}  ${words}  ${chars} ${args[0]}`);
        }
        break;

      case 'head':
        if (!args[0]) {
          appendToTerminal('head: missing file operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const fileDir = getDirAtPath(parentPath);
          if (!fileDir || !fileDir.content[fileName] || fileDir.content[fileName].type !== 'file') {
            appendToTerminal(`head: ${args[0]}: No such file or directory`);
            return;
          }
          const content = fileDir.content[fileName].content.split('\n').slice(0, 10).join('\n');
          appendToTerminal(content);
        }
        break;

      case 'tail':
        if (!args[0]) {
          appendToTerminal('tail: missing file operand');
          return;
        }
        {
          const filePath = resolvePath(args[0]);
          const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
          const fileName = filePath.split('/').pop();
          const fileDir = getDirAtPath(parentPath);
          if (!fileDir || !fileDir.content[fileName] || fileDir.content[fileName].type !== 'file') {
            appendToTerminal(`tail: ${args[0]}: No such file or directory`);
            return;
          }
          const content = fileDir.content[fileName].content.split('\n');
          const start = Math.max(0, content.length - 10);
          appendToTerminal(content.slice(start).join('\n'));
        }
        break;

      case 'which':
        if (!args[0]) {
          appendToTerminal('which: missing operand');
          return;
        }
        {
          const command = args[0];
          const paths = envVars.PATH.split(':');
          const commands = ['cat', 'cd', 'chmod', 'clear', 'cp', 'date', 'df', 'du', 'echo', 'env', 'find', 'grep', 'head', 'history', 'kill', 'ln', 'ls', 'man', 'mkdir', 'mv', 'ping', 'ps', 'pwd', 'rm', 'tail', 'tar', 'wc', 'which', 'who', 'whoami'];
          if (commands.includes(command)) {
            appendToTerminal(`/bin/${command}`);
          } else {
            appendToTerminal(`which: ${command}: command not found`);
          }
        }
        break;

      case 'man':
        if (!args[0]) {
          appendToTerminal('man: missing operand');
          return;
        }
        {
          const command = args[0];
          const manuals = {
            ls: 'ls [-l] - List directory contents\n  -l: Use long listing format',
            cd: 'cd <dir> - Change current directory',
            chmod: 'chmod <mode> <path> - Change file/directory permissions\n  mode: octal (e.g., 755) or symbolic (e.g., u+x)',
            clear: 'clear - Clear the terminal screen',
            cp: 'cp <src> <dest> - Copy file or directory',
            date: 'date - Show current date and time',
            df: 'df [-h] - Show disk usage\n  -h: Human-readable format',
            du: 'du [-sh] <path> - Show file/directory size\n  -sh: Summarize in human-readable format',
            echo: 'echo <text> [> file] - Print text or write to file',
            env: 'env [var=value] - Show or set environment variables',
            find: 'find <path> -name <pattern> - Search for files by name',
            grep: 'grep <pattern> <file> - Search text in file',
            head: 'head <file> - Show first 10 lines of file',
            history: 'history - Show command history',
            kill: 'kill <pid> - Terminate a process by PID',
            ln: 'ln -s <src> <link> - Create symbolic link',
            man: 'man <command> - Show manual for command',
            mkdir: 'mkdir <dir> - Create a new directory',
            mv: 'mv <src> <dest> - Move or rename file/directory',
            ping: 'ping [-c count | -t] <host> - Ping a host (continuous with -t)',
            ps: 'ps - List running processes',
            pwd: 'pwd - Print working directory',
            rm: 'rm <file/dir> - Remove a file or directory',
            tail: 'tail <file> - Show last 10 lines of file',
            tar: 'tar -cf <archive> <files> | -xf <archive> - Create/extract tar archive',
            wc: 'wc <file> - Count lines, words, characters',
            which: 'which <command> - Show command path',
            who: 'who - Show logged-in users',
            whoami: 'whoami - Display current user',
            color: 'color #RRGGBB - Change terminal output color (e.g., color #ff0000)'
          };
          if (manuals[command]) {
            appendToTerminal(`Manual for ${command}:\n${manuals[command]}`);
          } else {
            appendToTerminal(`man: no manual entry for ${command}`);
          }
        }
        break;

      case 'ps':
        appendToTerminal('  PID USER     COMMAND');
        processes.forEach(proc => {
          appendToTerminal(`${proc.pid.toString().padStart(5)} ${proc.user.padEnd(8)} ${proc.command}`);
        });
        break;

      case 'kill':
        if (!args[0]) {
          appendToTerminal('kill: missing PID');
          return;
        }
        {
          const pid = parseInt(args[0], 10);
          const index = processes.findIndex(proc => proc.pid === pid);
          if (index === -1) {
            appendToTerminal(`kill: ${pid}: No such process`);
          } else {
            processes.splice(index, 1);
            appendToTerminal(`Process ${pid} terminated`);
          }
        }
        break;

      case 'du':
        if (!args[0]) {
          appendToTerminal('du: missing path');
          return;
        }
        {
          const path = resolvePath(args[0]);
          const dir = getDirAtPath(path);
          if (!dir) {
            appendToTerminal(`du: ${args[0]}: No such file or directory`);
            return;
          }
          const size = dir.type === 'dir' ? calculateDirSize(dir, path) : dir.content.length;
          const humanReadable = args.includes('-h') || args.includes('-sh');
          const output = humanReadable ? `${Math.round(size / 1024)}K ${args[0]}` : `${size} ${args[0]}`;
          appendToTerminal(output);
        }
        break;

      case 'df':
        {
          const total = 1024 * 1024; // 1MB total space
          const used = calculateDirSize(fileSystem, '/');
          const free = total - used;
          const humanReadable = args.includes('-h');
          if (humanReadable) {
            appendToTerminal('Filesystem     Size  Used Avail Use%');
            appendToTerminal(`/dev/sda1     ${Math.round(total / 1024)}K ${Math.round(used / 1024)}K ${Math.round(free / 1024)}K ${Math.round((used / total) * 100)}%`);
          } else {
            appendToTerminal('Filesystem     1K-blocks  Used Available Use%');
            appendToTerminal(`/dev/sda1     ${total} ${used} ${free} ${Math.round((used / total) * 100)}%`);
          }
        }
        break;

      case 'tar':
        if (args[0] === '-cf' && args.length > 2) {
          const archivePath = resolvePath(args[1]);
          const parentPath = archivePath.substring(0, archivePath.lastIndexOf('/'));
          const archiveName = archivePath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!parentDir) {
            appendToTerminal(`tar: ${args[1]}: Cannot create archive in non-existent directory`);
            return;
          }
          let contents = '';
          for (let i = 2; i < args.length; i++) {
            const filePath = resolvePath(args[i]);
            const file = getDirAtPath(filePath);
            if (!file || file.type !== 'file') {
              appendToTerminal(`tar: ${args[i]}: No such file`);
              continue;
            }
            contents += `${args[i]}: ${file.content}\n`;
          }
          parentDir.content[archiveName] = {
            type: 'file',
            permissions: 'rw-r--r--',
            owner: 'user',
            group: 'user',
            content: contents
          };
        } else if (args[0] === '-xf' && args[1]) {
          const archivePath = resolvePath(args[1]);
          const parentPath = archivePath.substring(0, archivePath.lastIndexOf('/'));
          const archiveName = archivePath.split('/').pop();
          const parentDir = getDirAtPath(parentPath);
          if (!parentDir || !parentDir.content[archiveName] || parentDir.content[archiveName].type !== 'file') {
            appendToTerminal(`tar: ${args[1]}: No such file`);
            return;
          }
          const contents = parentDir.content[archiveName].content.split('\n').filter(line => line);
          contents.forEach(line => {
            const [name, content] = line.split(': ');
            const newFilePath = resolvePath(name);
            const newParentPath = newFilePath.substring(0, newFilePath.lastIndexOf('/'));
            const newFileName = newFilePath.split('/').pop();
            const newParentDir = getDirAtPath(newParentPath);
            if (newParentDir) {
              newParentDir.content[newFileName] = {
                type: 'file',
                permissions: 'rw-r--r--',
                owner: 'user',
                group: 'user',
                content
              };
            }
          });
        } else {
          appendToTerminal('tar: invalid syntax, use tar -cf <archive> <files> or tar -xf <archive>');
        }
        break;

      case 'who':
        appendToTerminal('user   tty1   Sep 15 21:44');
        break;

      case 'env':
        if (!args[0]) {
          Object.keys(envVars).forEach(key => {
            appendToTerminal(`${key}=${envVars[key]}`);
          });
        } else if (args[0].includes('=')) {
          const [key, value] = args[0].split('=');
          envVars[key] = value;
        } else {
          appendToTerminal(`env: invalid syntax or variable not found: ${args[0]}`);
        }
        break;

      case 'history':
        commandHistory.forEach((cmd, index) => {
          appendToTerminal(`${(index + 1).toString().padStart(4)}  ${cmd}`);
        });
        break;

      case 'whoami':
        appendToTerminal('user');
        break;

      case 'color':
        if (args.length < 1 || !/^#[0-9A-Fa-f]{6}$/.test(args[0])) {
          appendToTerminal('color: invalid syntax, use color #RRGGBB (e.g., color #ff0000)');
          return;
        }
        currentColor = args[0];
        document.documentElement.style.setProperty('--current-color', currentColor);
        appendToTerminal(`Color changed to ${currentColor}`);
        break;

      default:
        appendToTerminal(`Command not found: ${cmd}`);
    }

    commandHistory.push(command);
    historyIndex = commandHistory.length;
  }

  // Tab completion
  function getCompletions(input) {
    const [cmd, ...args] = input.trim().split(/\s+/);
    if (args.length === 0) {
      const commands = ['cat', 'cd', 'chmod', 'clear', 'cp', 'date', 'df', 'du', 'echo', 'env', 'find', 'grep', 'head', 'history', 'kill', 'ln', 'ls', 'man', 'mkdir', 'mv', 'ping', 'ps', 'pwd', 'rm', 'tail', 'tar', 'wc', 'which', 'who', 'whoami', 'color'];
      return commands.filter(c => c.startsWith(cmd)).sort();
    }
    if (['cd', 'cat', 'rm', 'touch', 'chmod', 'cp', 'mv', 'grep', 'wc', 'head', 'tail', 'du', 'tar'].includes(cmd) || (cmd === 'ln' && args[0] === '-s') || (cmd === 'find' && args[1] === '-name')) {
      const path = args[args.length - 1];
      const dirPath = resolvePath(path.substring(0, path.lastIndexOf('/') || 1));
      const dir = getDirAtPath(dirPath);
      if (!dir || !dir.content) return [];
      const prefix = path.split('/').pop();
      return Object.keys(dir.content).filter(item => item.startsWith(prefix)).sort();
    }
    if (cmd === 'which' || cmd === 'man') {
      const commands = ['cat', 'cd', 'chmod', 'clear', 'cp', 'date', 'df', 'du', 'echo', 'env', 'find', 'grep', 'head', 'history', 'kill', 'ln', 'ls', 'man', 'mkdir', 'mv', 'ping', 'ps', 'pwd', 'rm', 'tail', 'tar', 'wc', 'which', 'who', 'whoami', 'color'];
      return commands.filter(c => c.startsWith(args[0])).sort();
    }
    return [];
  }

  // Event listeners
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pingInterval) {
      appendToTerminal('^C');
      clearInterval(pingInterval);
      pingInterval = null;
      cmdInput.value = '';
      return;
    }
    processCommand(cmdInput.value);
    cmdInput.value = '';
    cmdInput.focus();
  });

  cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pingInterval) {
      e.preventDefault();
      appendToTerminal('^C');
      clearInterval(pingInterval);
      pingInterval = null;
      cmdInput.value = '';
      cmdInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        cmdInput.value = commandHistory[historyIndex] || '';
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        cmdInput.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        cmdInput.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const input = cmdInput.value;
      const completions = getCompletions(input);
      if (completions.length === 1) {
        const [cmd, ...args] = input.trim().split(/\s+/);
        if (args.length === 0) {
          cmdInput.value = completions[0];
        } else {
          const lastArg = args.pop();
          const prefix = lastArg.substring(0, lastArg.lastIndexOf('/') + 1);
          cmdInput.value = [...args, prefix + completions[0]].join(' ');
        }
      } else if (completions.length > 1) {
        appendToTerminal(completions.join('  '));
      }
    }
  });

  // Initialize terminal
  appendToTerminal('Welcome to Web Terminal Pro! Type "help" for a list of commands.');
  cmdInput.focus();
});