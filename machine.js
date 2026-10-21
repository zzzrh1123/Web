const terminal = document.getElementById("security-terminal");
const testArea = document.getElementById("test-area");
const feedback = document.getElementById("verification-feedback");
const attemptLabel = document.getElementById("attempt-label");
const progressDots = Array.from(document.querySelectorAll("#progress-dots span"));
const robotScene = document.getElementById("robot-scene");
const robotSpeech = document.getElementById("robot-speech");
const finalResult = document.getElementById("final-result");
const restartButton = document.getElementById("restart-verification");

let currentTest = -1;
let testLocked = false;
let taskCleanup = function () {};
let scheduledTimers = [];
let verificationStartedAt = 0;
let robotAudioContext = null;

function prepareRobotAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    if (!robotAudioContext) {
        robotAudioContext = new AudioContextClass();
    }

    if (robotAudioContext.state === "suspended") {
        robotAudioContext.resume().catch(function ignoreAudioError() {});
    }
}

function createDistortionCurve(amount) {
    const samples = 256;
    const curve = new Float32Array(samples);

    for (let index = 0; index < samples; index += 1) {
        const input = index * 2 / samples - 1;
        curve[index] = ((3 + amount) * input * 20 * Math.PI / 180)
            / (Math.PI + amount * Math.abs(input));
    }

    return curve;
}

function playRobotLaugh() {
    prepareRobotAudio();

    if (!robotAudioContext || robotAudioContext.state !== "running") {
        return;
    }

    const now = robotAudioContext.currentTime;
    const compressor = robotAudioContext.createDynamicsCompressor();
    const master = robotAudioContext.createGain();
    const echo = robotAudioContext.createDelay(0.5);
    const echoLevel = robotAudioContext.createGain();

    master.gain.setValueAtTime(0.34, now);
    echo.delayTime.setValueAtTime(0.115, now);
    echoLevel.gain.setValueAtTime(0.18, now);
    master.connect(compressor);
    master.connect(echo);
    echo.connect(echoLevel);
    echoLevel.connect(compressor);
    compressor.connect(robotAudioContext.destination);

    [188, 174, 158, 143].forEach(function makeLaughPulse(frequency, index) {
        const start = now + index * 0.24;
        const finish = start + 0.18;
        const voice = robotAudioContext.createOscillator();
        const voiceGain = robotAudioContext.createGain();
        const voiceFilter = robotAudioContext.createBiquadFilter();
        const distortion = robotAudioContext.createWaveShaper();
        const vibrato = robotAudioContext.createOscillator();
        const vibratoDepth = robotAudioContext.createGain();

        voice.type = "sawtooth";
        voice.frequency.setValueAtTime(frequency, start);
        voice.frequency.exponentialRampToValueAtTime(frequency * 0.72, finish);
        voiceFilter.type = "bandpass";
        voiceFilter.frequency.setValueAtTime(720 - index * 45, start);
        voiceFilter.Q.setValueAtTime(2.8, start);
        distortion.curve = createDistortionCurve(18);
        distortion.oversample = "2x";

        vibrato.type = "square";
        vibrato.frequency.setValueAtTime(26, start);
        vibratoDepth.gain.setValueAtTime(13, start);
        vibrato.connect(vibratoDepth);
        vibratoDepth.connect(voice.frequency);

        voiceGain.gain.setValueAtTime(0.0001, start);
        voiceGain.gain.exponentialRampToValueAtTime(0.38, start + 0.025);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, finish);

        voice.connect(distortion);
        distortion.connect(voiceFilter);
        voiceFilter.connect(voiceGain);
        voiceGain.connect(master);

        voice.start(start);
        vibrato.start(start);
        voice.stop(finish + 0.02);
        vibrato.stop(finish + 0.02);
    });
}

function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    scheduledTimers.push(timer);
    return timer;
}

function clearScheduledTimers() {
    scheduledTimers.forEach(function clearTimer(timer) {
        window.clearTimeout(timer);
    });
    scheduledTimers = [];
}

function setFeedback(text, type = "neutral") {
    feedback.textContent = text;
    feedback.classList.toggle("is-error", type === "error");
    feedback.classList.toggle("is-success", type === "success");
}

function updateProgress() {
    progressDots.forEach(function updateDot(dot, index) {
        dot.classList.toggle("is-current", index === currentTest);
        dot.classList.toggle("is-failed", index < currentTest);
        dot.classList.remove("is-passed");
    });
    attemptLabel.textContent = currentTest < 0 ? "TEST 0 OF 4" : `TEST ${currentTest + 1} OF 4`;
}

function bindOpeningCheckbox() {
    const checkbox = document.getElementById("robot-checkbox");
    checkbox.addEventListener("click", function beginVerification() {
        prepareRobotAudio();

        if (testLocked) {
            return;
        }
        testLocked = true;
        checkbox.classList.add("is-checking");
        setFeedback("Scanning for mechanical behaviour…");
        schedule(function openFirstTest() {
            verificationStartedAt = performance.now();
            loadTest(0);
        }, 750);
    });
}

function changeTestContent(html) {
    testArea.classList.remove("is-changing", "is-error");
    testArea.innerHTML = html;
    void testArea.offsetWidth;
    testArea.classList.add("is-changing");
}

function loadTest(index) {
    taskCleanup();
    taskCleanup = function () {};
    testLocked = false;
    currentTest = index;
    updateProgress();
    setFeedback("Analysing behaviour. Please act naturally robotic.");

    if (index === 0) {
        loadImageTest();
    } else if (index === 1) {
        loadStillnessTest();
    } else if (index === 2) {
        loadMotionTest();
    } else {
        loadConfidenceTest();
    }
}

function loadImageTest() {
    const trafficPattern = [true, false, false, true, false, true, false, false, true];
    changeTestContent(`
        <div class="captcha-test">
            <div class="captcha-instruction">
                <small>SELECT ALL SQUARES</small>
                <strong>without traffic lights</strong>
            </div>
            <div class="image-grid">
                ${trafficPattern.map(function createTile(hasTraffic, index) {
                    return `<button class="image-tile" type="button" data-index="${index}" data-correct="${!hasTraffic}" aria-label="City image ${index + 1}"><canvas></canvas></button>`;
                }).join("")}
            </div>
            <div class="verify-row">
                <span>Images refresh automatically</span>
                <button id="verify-images" class="verify-button" type="button">VERIFY</button>
            </div>
        </div>
    `);

    const tiles = Array.from(testArea.querySelectorAll(".image-tile"));
    tiles.forEach(function prepareTile(tile, index) {
        drawCityTile(tile.querySelector("canvas"), index, trafficPattern[index]);
        tile.addEventListener("click", function selectTile() {
            tile.classList.toggle("is-selected");
        });
    });

    testArea.querySelector("#verify-images").addEventListener("click", function verifyImages() {
        if (testLocked) {
            return;
        }
        const correct = tiles.every(function checkTile(tile) {
            return tile.classList.contains("is-selected") === (tile.dataset.correct === "true");
        });
        const responseTime = performance.now() - verificationStartedAt;
        let reason;
        if (!correct) {
            reason = "Incorrect selection. Biological visual bias detected.";
        } else if (responseTime > 5500) {
            reason = "Images correct, but hesitation exceeded robot limits.";
        } else {
            reason = "Images correct, but your confidence pattern appears human.";
        }
        failTest(reason);
    });
}

function drawCityTile(canvas, index, hasTrafficLight) {
    canvas.width = 150;
    canvas.height = 90;
    const drawing = canvas.getContext("2d");
    const skies = ["#91c5e6", "#a9cee3", "#77acd1", "#c4d7df"];
    const buildings = ["#53677b", "#6c7480", "#435b70", "#7c625c"];

    const sky = drawing.createLinearGradient(0, 0, 0, 70);
    sky.addColorStop(0, skies[index % skies.length]);
    sky.addColorStop(1, "#e8edf0");
    drawing.fillStyle = sky;
    drawing.fillRect(0, 0, 150, 90);

    for (let building = 0; building < 4; building += 1) {
        const width = 22 + ((index * 11 + building * 9) % 22);
        const height = 26 + ((index * 17 + building * 13) % 35);
        const x = building * 42 - 5 + (index % 3) * 4;
        drawing.fillStyle = buildings[(index + building) % buildings.length];
        drawing.fillRect(x, 58 - height, width, height);
        drawing.fillStyle = "rgba(245,225,152,0.7)";
        for (let windowX = x + 6; windowX < x + width - 3; windowX += 10) {
            drawing.fillRect(windowX, 64 - height, 4, 5);
        }
    }

    drawing.fillStyle = "#59636c";
    drawing.beginPath();
    drawing.moveTo(0, 59);
    drawing.lineTo(150, 50 + (index % 2) * 5);
    drawing.lineTo(150, 90);
    drawing.lineTo(0, 90);
    drawing.fill();

    drawing.strokeStyle = "rgba(255,255,255,0.72)";
    drawing.lineWidth = 3;
    drawing.setLineDash([13, 10]);
    drawing.beginPath();
    drawing.moveTo(0, 77);
    drawing.lineTo(150, 69);
    drawing.stroke();
    drawing.setLineDash([]);

    if (hasTrafficLight) {
        const lightX = 38 + (index * 23) % 72;
        drawing.fillStyle = "#252d34";
        drawing.fillRect(lightX, 22, 7, 55);
        drawing.fillRect(lightX - 10, 17, 27, 38);
        ["#ff5869", "#ffc34f", "#57d58a"].forEach(function drawLight(color, lightIndex) {
            drawing.fillStyle = color;
            drawing.beginPath();
            drawing.arc(lightX + 3.5, 24 + lightIndex * 11, 4, 0, Math.PI * 2);
            drawing.fill();
        });
    } else {
        const treeX = 38 + (index * 21) % 82;
        drawing.fillStyle = "#59604e";
        drawing.fillRect(treeX, 38, 5, 31);
        drawing.fillStyle = "#538468";
        drawing.beginPath();
        drawing.arc(treeX + 2, 31, 16, 0, Math.PI * 2);
        drawing.fill();
    }
}

function loadStillnessTest() {
    changeTestContent(`
        <div class="stillness-test">
            <div id="stillness-meter" class="stillness-meter" style="--still-progress: 0%">
                <strong id="stillness-time">3.0</strong>
            </div>
            <h3>Remain perfectly still</h3>
            <p>Robots do not make nervous micro-movements. Do not move your pointer for three seconds.</p>
            <button id="begin-stillness" class="task-button" type="button">BEGIN SCAN</button>
        </div>
    `);

    const beginButton = testArea.querySelector("#begin-stillness");
    const meter = testArea.querySelector("#stillness-meter");
    const timeLabel = testArea.querySelector("#stillness-time");
    let scanStart = 0;
    let animationFrame = 0;
    let scanning = false;
    let resetCount = 0;
    let previousPointer = null;

    function pointerMoved(event) {
        if (!scanning) {
            return;
        }
        const current = { x: event.clientX, y: event.clientY };
        if (previousPointer && Math.hypot(current.x - previousPointer.x, current.y - previousPointer.y) > 2) {
            scanStart = performance.now();
            resetCount += 1;
            setFeedback(`Movement detected. Stillness timer reset (${resetCount}).`, "error");
        }
        previousPointer = current;
    }

    function updateStillness(now) {
        if (!scanning) {
            return;
        }
        const elapsed = now - scanStart;
        const progress = Math.min(1, elapsed / 3000);
        meter.style.setProperty("--still-progress", `${progress * 100}%`);
        timeLabel.textContent = Math.max(0, (3 - elapsed / 1000)).toFixed(1);
        if (progress >= 1) {
            scanning = false;
            document.removeEventListener("pointermove", pointerMoved);
            failTest(resetCount > 0
                ? "Stillness achieved, but previous corrections reveal biological muscles."
                : "Stillness looked intentional. A real robot would not need instructions.");
            return;
        }
        animationFrame = window.requestAnimationFrame(updateStillness);
    }

    beginButton.addEventListener("click", function startStillnessScan() {
        if (scanning || testLocked) {
            return;
        }
        scanning = true;
        scanStart = performance.now();
        beginButton.disabled = true;
        beginButton.textContent = "DO NOT MOVE";
        setFeedback("Capturing movement signature…");
        document.addEventListener("pointermove", pointerMoved);
        animationFrame = window.requestAnimationFrame(updateStillness);
    });

    taskCleanup = function cleanStillnessTest() {
        scanning = false;
        document.removeEventListener("pointermove", pointerMoved);
        window.cancelAnimationFrame(animationFrame);
    };
}

function loadMotionTest() {
    changeTestContent(`
        <div class="motion-test">
            <h3>Move with mechanical precision</h3>
            <p>Drag the blue control from START to END in one perfectly straight movement.</p>
            <div id="motion-track" class="motion-track">
                <span class="motion-start">START</span>
                <span class="motion-end">END</span>
                <button id="motion-cursor" class="motion-cursor" type="button" aria-label="Drag from start to end"></button>
            </div>
        </div>
    `);

    const track = testArea.querySelector("#motion-track");
    const cursor = testArea.querySelector("#motion-cursor");
    let dragging = false;
    let totalDeviation = 0;
    let samples = 0;

    function moveCursor(event) {
        if (!dragging || testLocked) {
            return;
        }
        event.preventDefault();
        const rectangle = track.getBoundingClientRect();
        const x = Math.max(10, Math.min(rectangle.width - 40, event.clientX - rectangle.left - 15));
        const pointerY = event.clientY - rectangle.top;
        const centerY = rectangle.height / 2;
        totalDeviation += Math.abs(pointerY - centerY);
        samples += 1;
        cursor.style.left = `${x}px`;

        if (x >= rectangle.width - 43) {
            dragging = false;
            const averageDeviation = totalDeviation / Math.max(1, samples);
            const reason = averageDeviation < 2.5
                ? "Trajectory was suspiciously perfect. A human appears to be imitating a robot."
                : `Organic micro-curves detected (${averageDeviation.toFixed(1)}px deviation).`;
            failTest(reason);
        }
    }

    cursor.addEventListener("pointerdown", function beginMotion(event) {
        if (testLocked) {
            return;
        }
        dragging = true;
        totalDeviation = 0;
        samples = 0;
        track.setPointerCapture(event.pointerId);
        setFeedback("Recording motor trajectory…");
    });
    track.addEventListener("pointermove", moveCursor);
    track.addEventListener("pointerup", function stopMotion() {
        dragging = false;
    });
    track.addEventListener("pointercancel", function cancelMotion() {
        dragging = false;
    });
}

function loadConfidenceTest() {
    changeTestContent(`
        <div class="button-test">
            <h3>Final identity declaration</h3>
            <p>A machine answers instantly and without emotional uncertainty.</p>
            <button id="human-robot-button" class="human-button" type="button">I AM DEFINITELY A ROBOT</button>
        </div>
    `);

    const declarationButton = testArea.querySelector("#human-robot-button");
    const appearedAt = performance.now();
    declarationButton.addEventListener("click", function declareRobotIdentity() {
        const hesitation = performance.now() - appearedAt;
        const reason = hesitation < 450
            ? "Response was too eager. Biological optimism detected."
            : `Response delayed by ${(hesitation / 1000).toFixed(2)}s. Robots do not reconsider their identity.`;
        failTest(reason);
    });
}

function failTest(reason) {
    if (testLocked) {
        return;
    }
    testLocked = true;
    taskCleanup();
    taskCleanup = function () {};
    testArea.classList.add("is-error");
    progressDots[currentTest].classList.remove("is-current");
    progressDots[currentTest].classList.add("is-failed");
    setFeedback(`Verification failed: ${reason}`, "error");

    schedule(function continueAfterFailure() {
        if (currentTest < 3) {
            loadTest(currentTest + 1);
        } else {
            beginDenialSequence();
        }
    }, 1600);
}

function showRobotSpeech(text) {
    robotSpeech.textContent = text;
    robotSpeech.classList.add("is-visible");
}

function beginDenialSequence() {
    testLocked = true;
    terminal.classList.add("is-denied");
    robotScene.setAttribute("aria-hidden", "false");
    robotScene.className = "robot-scene is-arriving is-walking";
    setFeedback("Maximum human characteristics reached. Access permanently denied.", "error");

    schedule(function laughAtHuman() {
        showRobotSpeech("HA. HA. HA.");
        playRobotLaugh();
    }, 750);

    schedule(function greetHuman() {
        showRobotSpeech("Nice try, someone.");
    }, 1750);

    schedule(function startRobotTest() {
        robotScene.className = "robot-scene is-solving";
        showRobotSpeech("Verification? Easy.");
        attemptLabel.textContent = "ROBOT TESTING";
        setFeedback("Mechanical signature R-01 detected.", "success");
    }, 2700);

    progressDots.forEach(function passRobotTest(dot, index) {
        schedule(function lightPassedDot() {
            dot.className = "is-passed";
        }, 3150 + index * 210);
    });

    schedule(function revealRobotDoor() {
        robotScene.classList.add("is-door-visible");
        showRobotSpeech("Access granted.");
    }, 4100);

    schedule(function openRobotDoor() {
        robotScene.classList.add("is-door-open");
    }, 4650);

    schedule(function sendRobotInside() {
        robotScene.className = "robot-scene is-door-visible is-door-open is-leaving is-walking";
        robotSpeech.classList.remove("is-visible");
    }, 5300);

    schedule(function revealFinalResult() {
        finalResult.classList.add("is-visible");
        finalResult.setAttribute("aria-hidden", "false");
        robotScene.classList.remove("is-walking");
    }, 7300);
}

function resetVerification() {
    clearScheduledTimers();
    taskCleanup();
    taskCleanup = function () {};
    currentTest = -1;
    testLocked = false;
    verificationStartedAt = 0;
    terminal.classList.remove("is-denied");
    robotScene.className = "robot-scene";
    robotScene.setAttribute("aria-hidden", "true");
    robotSpeech.classList.remove("is-visible");
    finalResult.classList.remove("is-visible");
    finalResult.setAttribute("aria-hidden", "true");
    testArea.classList.remove("is-changing", "is-error");
    testArea.innerHTML = `
        <button id="robot-checkbox" class="robot-checkbox" type="button">
            <span class="checkbox-square" aria-hidden="true"></span>
            <span class="checkbox-label">Are you a robot?</span>
            <span class="captcha-seal" aria-hidden="true">
                <b>R</b>
                <small>ROBOTCAPTCHA</small>
            </span>
        </button>
    `;
    setFeedback("Waiting for verification request.");
    updateProgress();
    bindOpeningCheckbox();
}

restartButton.addEventListener("click", resetVerification);
bindOpeningCheckbox();
updateProgress();
