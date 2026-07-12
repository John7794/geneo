const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix saveFileToFirestore
code = code.replace(
`    } catch (e) {
      console.error(\`[Firestore DB] Failed to save \${filePath} to Firestore:\`, e);
      
  }
  
  // Restore database files on startup or trigger`,
`    } catch (e) {
      console.error(\`[Firestore DB] Failed to save \${filePath} to Firestore:\`, e);
    }
  }
  
  // Restore database files on startup or trigger`
);

// Fix restoreFilesFromFirestore
code = code.replace(
`          } else {
            textContent = data.content;
            
            
          const fullLocalPath = path.join('/tmp/data', cleanPath);
          fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });
          fs.writeFileSync(fullLocalPath, textContent, 'utf8');
          count++;
          
        
      console.log(\`[Firestore DB] Restored \${count} files from Firestore to /tmp/data\`);
    } catch (e) {`,
`          } else {
            textContent = data.content;
          }
          const fullLocalPath = path.join('/tmp/data', cleanPath);
          fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });
          fs.writeFileSync(fullLocalPath, textContent, 'utf8');
          count++;
        }
      }
      console.log(\`[Firestore DB] Restored \${count} files from Firestore to /tmp/data\`);
    } catch (e) {`
);

// Fix saveAllTmpFilesToFirestore
code = code.replace(
`      csvFiles.forEach(f => {
        filesToSave.push(\`db/uk/\${f}\`);
  );
  
  
    console.log(\`[Firestore DB] Uploading \${filesToSave.length} files to Firestore...\`);`,
`      csvFiles.forEach(f => {
        filesToSave.push(\`db/uk/\${f}\`);
      });
    }
    console.log(\`[Firestore DB] Uploading \${filesToSave.length} files to Firestore...\`);`
);

// Save and let's see next error
fs.writeFileSync('server.ts', code);
