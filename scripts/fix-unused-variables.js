#!/usr/bin/env node

/**
 * Script to help fix unused variables in the codebase
 * 
 * This script provides utilities to:
 * 1. Run ESLint with auto-fix for unused imports
 * 2. Generate a report of remaining unused variables
 * 3. Provide suggestions for manual fixes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const webAppPath = path.join(__dirname, '..', 'apps', 'web');

console.log('🔧 Unused Variables Cleanup Script\n');

// Step 1: Install required ESLint plugin if needed
console.log('📦 Checking ESLint plugins...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(webAppPath, 'package.json'), 'utf8'));
  const hasImportPlugin = packageJson.devDependencies?.['eslint-plugin-import'] || 
                          packageJson.dependencies?.['eslint-plugin-import'];
  
  if (!hasImportPlugin) {
    console.log('Installing eslint-plugin-import...');
    execSync('npm install --save-dev eslint-plugin-import', { 
      cwd: webAppPath,
      stdio: 'inherit' 
    });
  }
} catch (error) {
  console.error('Error checking/installing ESLint plugins:', error.message);
}

// Step 2: Run ESLint with auto-fix
console.log('\n🔍 Running ESLint with auto-fix for unused imports...');
try {
  execSync('npm run lint -- --fix', { 
    cwd: webAppPath,
    stdio: 'inherit' 
  });
  console.log('✅ Auto-fix completed!');
} catch (error) {
  console.log('⚠️  ESLint found issues that need manual attention');
}

// Step 3: Generate a detailed report
console.log('\n📊 Generating unused variables report...');
try {
  const lintOutput = execSync('npm run lint -- --format json', { 
    cwd: webAppPath,
    encoding: 'utf8'
  });
  
  const results = JSON.parse(lintOutput);
  const unusedVarIssues = [];
  
  results.forEach(file => {
    const unusedInFile = file.messages.filter(msg => 
      msg.ruleId === '@typescript-eslint/no-unused-vars'
    );
    
    if (unusedInFile.length > 0) {
      unusedVarIssues.push({
        file: file.filePath.replace(webAppPath, ''),
        issues: unusedInFile
      });
    }
  });
  
  // Generate report
  if (unusedVarIssues.length > 0) {
    console.log('\n📋 Remaining unused variables that need manual attention:\n');
    
    unusedVarIssues.forEach(({ file, issues }) => {
      console.log(`\n📄 ${file}`);
      issues.forEach(issue => {
        console.log(`   Line ${issue.line}:${issue.column} - ${issue.message}`);
        
        // Provide suggestions
        if (issue.message.includes('is defined but never used')) {
          console.log('   💡 Suggestion: Remove the import or prefix with underscore');
        } else if (issue.message.includes('is assigned a value but never used')) {
          console.log('   💡 Suggestion: Remove the variable or prefix with underscore');
        }
      });
    });
    
    // Summary
    const totalIssues = unusedVarIssues.reduce((sum, item) => sum + item.issues.length, 0);
    console.log(`\n📈 Summary: ${totalIssues} unused variable issues in ${unusedVarIssues.length} files`);
  } else {
    console.log('\n✨ No unused variables found!');
  }
  
} catch (error) {
  console.error('Error generating report:', error.message);
}

console.log('\n💡 Quick fixes for common patterns:');
console.log('1. Prefix unused parameters with underscore: (data, _index) => ...');
console.log('2. Use rest parameters for unused props: const { used, ...rest } = props');
console.log('3. Add eslint-disable comment for legitimate cases: // eslint-disable-next-line @typescript-eslint/no-unused-vars');
console.log('4. Remove completely unused imports and variables');
console.log('\n🎯 Next steps:');
console.log('1. Review the report above');
console.log('2. Fix remaining issues manually');
console.log('3. Run "npm run lint" to verify all issues are resolved');