import re

with open('server.ts.fixed1', 'r') as f:
    content = f.read()

# Fix 1: saveFileToFirestore
old_1 = """      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
        adminConfig.credential = admin.credential.cert(serviceAccount);
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
    } catch (e: any) {"""
new_1 = """      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
      }
      adminConfig.credential = admin.credential.cert(serviceAccount);
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
    } catch (e: any) {"""
content = content.replace(old_1, new_1)

# Fix 2: try catch in auth
old_2 = """    } catch (e: any) {
      res.status(500).json({ error: e.message });
  });"""
new_2 = """    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""
content = content.replace(old_2, new_2)

# Fix 3: saveFileToFirestore missing }
old_3 = """        updatedAt: admin.firestore.FieldValue.serverTimestamp()
  );
      console.log(`[Firestore DB] Saved compressed ${cleanPath} to Firestore`);
    } catch (e) {
      console.error(`[Firestore DB] Failed to save ${filePath} to Firestore:`, e);
  }

  // Restore database files on startup or trigger"""
new_3 = """        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[Firestore DB] Saved compressed ${cleanPath} to Firestore`);
    } catch (e) {
      console.error(`[Firestore DB] Failed to save ${filePath} to Firestore:`, e);
    }
  }

  // Restore database files on startup or trigger"""
# wait, the template has variables, maybe string literal will fail. I'll use regex.
content = re.sub(
    r"updatedAt: admin\.firestore\.FieldValue\.serverTimestamp\(\)\s*\);\s*console\.log\(`\[Firestore DB\] Saved compressed \$\{cleanPath\} to Firestore`\);\s*\} catch \(e\) \{\s*console\.error\(`\[Firestore DB\] Failed to save \$\{filePath\} to Firestore:`, e\);\s*\}",
    r"updatedAt: admin.firestore.FieldValue.serverTimestamp()\n      });\n      console.log(`[Firestore DB] Saved compressed ${cleanPath} to Firestore`);\n    } catch (e) {\n      console.error(`[Firestore DB] Failed to save ${filePath} to Firestore:`, e);\n    }\n  }",
    content
)

# Fix 4: restoreFilesFromFirestore missing brackets
content = re.sub(
    r"\} else \{\s*textContent = data\.content;\s*const fullLocalPath = path\.join",
    r"} else {\n            textContent = data.content;\n          }\n          const fullLocalPath = path.join",
    content
)
content = re.sub(
    r"fs\.writeFileSync\(fullLocalPath, textContent, 'utf8'\);\s*count\+\+;\s*console\.log\(`\[Firestore DB\] Restored \$\{count\} files",
    r"fs.writeFileSync(fullLocalPath, textContent, 'utf8');\n          count++;\n        }\n      }\n      console.log(`[Firestore DB] Restored ${count} files",
    content
)
content = re.sub(
    r"console\.error\(\"\[Firestore DB\] Failed to restore files from Firestore:\", e\);\s*\}\s*// Upload all dynamic files",
    r"console.error(\"[Firestore DB] Failed to restore files from Firestore:\", e);\n    }\n  }\n\n  // Upload all dynamic files",
    content
)

# Fix 5: saveAllTmpFilesToFirestore
content = re.sub(
    r"csvFiles\.forEach\(f => \{\s*filesToSave\.push\(`db/uk/\$\{f\}`\);\s*\);\s*console\.log",
    r"csvFiles.forEach(f => {\n        filesToSave.push(`db/uk/${f}`);\n      });\n    }\n\n    console.log",
    content
)
content = re.sub(
    r"console\.error\(\"\[Firestore DB\] Failed to upload files to Firestore:\", e\);\s*\}\s*// Data boot process",
    r"console.error(\"[Firestore DB] Failed to upload files to Firestore:\", e);\n    }\n  }\n\n  // Data boot process",
    content
)

# Fix 6: ensureBootstrapData
content = re.sub(
    r"console\.error\(\"\[Data Boot\] Failed bootstrapping:\", e\);\s*\)\(\);\s*return bootPromise;\s*\}",
    r"console.error(\"[Data Boot] Failed bootstrapping:\", e);\n        }\n      })();\n    }\n    return bootPromise;\n  }",
    content
)

# Fix 7: getUserAccess
content = re.sub(
    r"isMainAdmin: true\s*;\s*// 2\. Fetch from Firestore",
    r"isMainAdmin: true\n      };\n    }\n\n    // 2. Fetch from Firestore",
    content
)
content = re.sub(
    r"canSync: data\.canSync === true\s*;\s*if \(bestShare\) return bestShare;\s*\} catch \(e\) \{",
    r"canSync: data.canSync === true\n           };\n        }\n        if (bestShare) return bestShare;\n      }\n    } catch (e) {",
    content
)

# Fix 8: authMiddleware
content = re.sub(
    r"await ensureBootstrapData\(\);\s*\} catch \(e\) \{\s*// ignore\s*// Allow public access",
    r"            await ensureBootstrapData();\n          }\n        }\n      } catch (e) {\n        // ignore\n      }\n    }\n\n    // Allow public access",
    content
)
content = re.sub(
    r"if \(!req\.path\.startsWith\('/login'\)\) \{\s*return res\.redirect\('/login'\);\s*const userConfig",
    r"if (!req.path.startsWith('/login')) {\n          return res.redirect('/login');\n        }\n      }\n\n      const userConfig",
    content
)
content = re.sub(
    r"req\.userConfig = userConfig;\s*req\.userEmail = email;\s*next\(\);\s*app\.get\('/robots\.txt'",
    r"      req.userConfig = userConfig;\n      req.userEmail = email;\n      next();\n    } catch (e) {\n      console.error('[Auth] Error in auth middleware', e);\n      res.status(500).send('Internal Auth Error');\n    }\n  };\n\n  app.get('/robots.txt'",
    content
)

# Fix 9: vite middleware and else block
content = re.sub(
    r"appType: \"spa\",\s*\);\s*app\.use\(vite\.middlewares\);",
    r"appType: \"spa\",\n      });\n      app.use(vite.middlewares);",
    content
)
content = re.sub(
    r"res\.status\(500\)\.json\(\{ error: \"Express Error\", message: err\.message \}\);\s*\);\s*if \(!process\.env\.VERCEL\)",
    r"res.status(500).json({ error: \"Express Error\", message: err.message });\n      });\n\n      if (!process.env.VERCEL)",
    content
)
content = re.sub(
    r"console\.log\(`Server running on http://localhost:\$\{PORT\}`\);\s*\);\s*\)\(\);\s*\} else \{",
    r"console.log(`Server running on http://localhost:${PORT}`);\n        });\n      }\n    })();\n  } else {",
    content
)
content = re.sub(
    r"res\.setHeader\('Cache-Control', 'public, max-age=31536000, immutable'\);\s*\)\);\s*// Intercept",
    r"res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');\n        }\n      }\n    }));\n\n    // Intercept",
    content
)
content = re.sub(
    r"setTimeout\(\(\) => window\.location\.reload\(true\), 500\);\`\);\s*\);\s*app\.get",
    r"setTimeout(() => window.location.reload(true), 500);`);\n    });\n\n    app.get",
    content
)
content = re.sub(
    r"res\.sendFile\(path\.join\(distPath, 'index\.html'\)\);\s*\);\s*// Global Error Handler",
    r"res.sendFile(path.join(distPath, 'index.html'));\n    });\n\n    // Global Error Handler",
    content
)
content = re.sub(
    r"res\.status\(500\)\.json\(\{ error: \"Express Error\", message: err\.message \}\);\s*\);\s*if \(!process\.env\.VERCEL\)",
    r"res.status(500).json({ error: \"Express Error\", message: err.message });\n    });\n\n    if (!process.env.VERCEL)",
    content
)
content = re.sub(
    r"console\.log\(`Server running on http://localhost:\$\{PORT\}`\);\s*\);\s*\}",
    r"console.log(`Server running on http://localhost:${PORT}`);\n      });\n    }\n  }",
    content
)

with open('server_fixed.ts', 'w') as f:
    f.write(content)
