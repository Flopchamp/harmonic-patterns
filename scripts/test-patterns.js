/**
 * Test Pattern Detection Logic
 * 
 * This script tests the harmonic pattern detection algorithms
 * using known pattern examples to verify accuracy.
 */

const fs = require('fs');
const path = require('path');

// Load harmonicPatterns.js
const harmonicPatternsPath = path.join(__dirname, '..', 'src', 'js', 'harmonicPatterns.js');
const harmonicPatternsContent = fs.readFileSync(harmonicPatternsPath, 'utf8');
eval(harmonicPatternsContent.replace(/class HarmonicPatterns/g, 'global.HarmonicPatterns = class'));

// Create pattern detector
const harmonicPatterns = new HarmonicPatterns();

// Test data for different pattern types
const patternTestCases = {
    gartley: [
        {
            name: 'Bullish Gartley',
            points: {
                x: 100,
                a: 161.8, // Upward move (X to A)
                b: 123.6, // 0.618 retracement (A to B)
                c: 138.2, // 0.382-0.886 retracement (B to C)
                d: 111.7  // 0.786 retracement (X to D)
            },
            direction: 'bullish',
            expectedResult: true
        },
        {
            name: 'Bearish Gartley',
            points: {
                x: 100,
                a: 61.8,  // Downward move (X to A)
                b: 76.4,  // 0.618 retracement (A to B)
                c: 68.4,  // 0.382-0.886 retracement (B to C)
                d: 87.8   // 0.786 retracement (X to D)
            },
            direction: 'bearish',
            expectedResult: true
        }
    ],
    butterfly: [
        {
            name: 'Bullish Butterfly',
            points: {
                x: 100,
                a: 161.8, // Upward move (X to A)
                b: 127.3, // 0.786 retracement (A to B)
                c: 142.3, // 0.382-0.886 retracement (B to C)
                d: 70.0   // 1.27-1.618 extension (X to D)
            },
            direction: 'bullish',
            expectedResult: true
        },
        {
            name: 'Bearish Butterfly',
            points: {
                x: 100,
                a: 61.8,  // Downward move (X to A)
                b: 73.1,  // 0.786 retracement (A to B)
                c: 68.1,  // 0.382-0.886 retracement (B to C)
                d: 125.0  // 1.27-1.618 extension (X to D)
            },
            direction: 'bearish',
            expectedResult: true
        }
    ],
    bat: [
        {
            name: 'Bullish Bat',
            points: {
                x: 100,
                a: 161.8, // Upward move (X to A)
                b: 129.1, // 0.5 retracement (A to B)
                c: 145.5, // 0.382-0.886 retracement (B to C)
                d: 111.7  // 0.886 retracement (X to D)
            },
            direction: 'bullish',
            expectedResult: true
        },
        {
            name: 'Bearish Bat',
            points: {
                x: 100,
                a: 61.8,  // Downward move (X to A)
                b: 75.9,  // 0.5 retracement (A to B)
                c: 68.5,  // 0.382-0.886 retracement (B to C)
                d: 88.6   // 0.886 retracement (X to D)
            },
            direction: 'bearish',
            expectedResult: true
        }
    ],
    crab: [
        {
            name: 'Bullish Crab',
            points: {
                x: 100,
                a: 161.8, // Upward move (X to A)
                b: 129.1, // 0.618 retracement (A to B)
                c: 145.5, // 0.382-0.886 retracement (B to C)
                d: 61.8   // 1.618 retracement (X to D)
            },
            direction: 'bullish',
            expectedResult: true
        },
        {
            name: 'Bearish Crab',
            points: {
                x: 100,
                a: 61.8,  // Downward move (X to A)
                b: 75.9,  // 0.618 retracement (A to B)
                c: 68.5,  // 0.382-0.886 retracement (B to C)
                d: 138.2  // 1.618 retracement (X to D)
            },
            direction: 'bearish',
            expectedResult: true
        }
    ],
    // ABCD Pattern test cases
    abcd: [
        {
            name: 'Bullish ABCD',
            points: {
                a: 100,
                b: 80,    // Retracement (A to B)
                c: 95,    // Move in trend direction (B to C)
                d: 68     // Extension (C to D)
            },
            direction: 'bullish',
            expectedResult: true
        },
        {
            name: 'Bearish ABCD',
            points: {
                a: 100,
                b: 110,   // Retracement (A to B)
                c: 103,   // Move in trend direction (B to C)
                d: 120    // Extension (C to D)
            },
            direction: 'bearish',
            expectedResult: true
        }
    ],
    // Invalid patterns for testing rejection
    invalid: [
        {
            name: 'Invalid Pattern (wrong ratios)',
            points: {
                x: 100,
                a: 150,
                b: 140,
                c: 145,
                d: 95
            },
            direction: 'bullish',
            expectedResult: false
        },
        {
            name: 'Invalid Direction Change',
            points: {
                x: 100,
                a: 150, // Upward move (X to A)
                b: 160, // Should be downward, but is upward
                c: 145,
                d: 120
            },
            direction: 'bullish',
            expectedResult: false
        }
    ]
};

// Convert static test case to price data format with OHLC values
function generateOHLCFromPoints(points, symbol = 'TEST') {
    const data = [];
    const timeBase = Date.now();
    const pointNames = Object.keys(points);
    
    // Add some buffer points before and after
    const allPoints = [
        { name: 'pre2', value: points[pointNames[0]] * 0.9 },
        { name: 'pre1', value: points[pointNames[0]] * 0.95 },
        ...pointNames.map(name => ({ name, value: points[name] })),
        { name: 'post1', value: points[pointNames[pointNames.length-1]] * 1.05 },
        { name: 'post2', value: points[pointNames[pointNames.length-1]] * 1.1 }
    ];
    
    // Convert to OHLC data
    allPoints.forEach((point, i) => {
        // Add some random variation for high/low
        const variation = point.value * 0.01;
        data.push({
            time: timeBase - (allPoints.length - i) * 60000, // 1 minute between points
            symbol,
            open: point.value - variation/2,
            high: point.value + variation,
            low: point.value - variation,
            close: point.value
        });
    });
    
    return data;
}

// Function to test a specific pattern type
function testPatternType(patternType, testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TESTING ${patternType.toUpperCase()} PATTERN DETECTION`);
    console.log(`${'='.repeat(80)}`);
    
    let passCount = 0;
    
    testCases.forEach((testCase, index) => {
        console.log(`\nTest ${index + 1}: ${testCase.name}`);
        console.log('-'.repeat(50));
        
        // Generate OHLC data from test points
        const data = generateOHLCFromPoints(testCase.points);
        
        // Call pattern detection function
        let detected;
        if (patternType === 'abcd') {
            // Test ABCD pattern
            const pointsABCD = {
                a: testCase.points.a,
                b: testCase.points.b,
                c: testCase.points.c,
                d: testCase.points.d
            };
            detected = harmonicPatterns.detectABCDPattern(pointsABCD, testCase.direction);
        } else if (patternType !== 'invalid') {
            // Test XABCD pattern
            const pointsXABCD = {
                x: testCase.points.x,
                a: testCase.points.a,
                b: testCase.points.b,
                c: testCase.points.c,
                d: testCase.points.d
            };
            detected = harmonicPatterns.detectXABCDPattern(pointsXABCD, patternType, testCase.direction);
        } else {
            // For invalid tests, try different pattern types to see if any would detect this as valid
            const pointsXABCD = testCase.points;
            detected = (
                harmonicPatterns.detectXABCDPattern(pointsXABCD, 'gartley', testCase.direction) ||
                harmonicPatterns.detectXABCDPattern(pointsXABCD, 'butterfly', testCase.direction) ||
                harmonicPatterns.detectXABCDPattern(pointsXABCD, 'bat', testCase.direction) ||
                harmonicPatterns.detectXABCDPattern(pointsXABCD, 'crab', testCase.direction)
            );
        }
        
        // Verify results
        const passed = (detected !== null) === testCase.expectedResult;
        
        console.log('Input points:', testCase.points);
        console.log('Expected:', testCase.expectedResult ? 'PATTERN SHOULD BE DETECTED' : 'PATTERN SHOULD NOT BE DETECTED');
        console.log('Actual:', detected ? 'PATTERN DETECTED ✓' : 'PATTERN NOT DETECTED ✗');
        
        if (detected) {
            console.log('\nDetected pattern:');
            console.log('Type:', detected.pattern);
            console.log('Direction:', detected.direction);
            console.log('Ratios:', detected.ratios);
        }
        
        console.log('\nResult:', passed ? 'PASS ✓' : 'FAIL ✗');
        
        if (passed) passCount++;
    });
    
    console.log(`\nSummary for ${patternType}: ${passCount}/${testCases.length} tests passed`);
    
    return {
        patternType,
        totalTests: testCases.length,
        passedTests: passCount,
        success: passCount === testCases.length
    };
}

// Function to run all pattern tests
function runAllTests() {
    console.log('HARMONIC PATTERN DETECTION TESTING');
    console.log('=================================\n');
    
    const results = [];
    
    // Test each pattern type
    for (const [patternType, testCases] of Object.entries(patternTestCases)) {
        const result = testPatternType(patternType, testCases);
        results.push(result);
    }
    
    // Print overall summary
    console.log('\n\nTEST SUMMARY');
    console.log('===========');
    
    let totalTests = 0;
    let passedTests = 0;
    
    results.forEach(result => {
        console.log(`${result.patternType}: ${result.passedTests}/${result.totalTests} ${result.success ? '✓' : '✗'}`);
        totalTests += result.totalTests;
        passedTests += result.passedTests;
    });
    
    console.log(`\nOverall: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    return {
        passRate: passedTests / totalTests,
        passed: passedTests === totalTests
    };
}

// Run the tests
const finalResult = runAllTests();

// Exit with appropriate code
process.exit(finalResult.passed ? 0 : 1);
