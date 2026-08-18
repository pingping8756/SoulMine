try {
    eval(new ActiveXObject('Scripting.FileSystemObject').OpenTextFile('app.js', 1).ReadAll());
    WScript.Echo('Syntax OK');
} catch (e) {
    WScript.Echo('Syntax Error: ' + e.message + ' at line ' + e.line);
}
