try { var f = new Function(WScript.StdIn.ReadAll()); WScript.Echo('OK'); } catch(e) { WScript.Echo('ERROR: ' + e.message + ' line:' + e.number); }
