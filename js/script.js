/**
 * Quiz Engine for Mohan Paudel's Educational Resources
 * Optimized to load questions from JSON and handle dynamic quiz states
 */

const homeElement = document.getElementById('home');
const quizElement = document.getElementById('quiz');
const endElement = document.getElementById('end');
const reviewElement = document.getElementById('review');
const startButton = document.getElementById('start-btn');
const nextButton = document.getElementById('next-btn');
const questionElement = document.getElementById('question');
const questionCounterElement = document.getElementById('question-counter');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const topicIndicatorElement = document.getElementById('topic-indicator');
const explanationContainer = document.getElementById('explanation-container');
const explanationText = document.getElementById('explanation-text');
const finalScoreElement = document.getElementById('final-score');
const correctCountElement = document.getElementById('correct-count');
const incorrectCountElement = document.getElementById('incorrect-count');
const unansweredCountElement = document.getElementById('unanswered-count');
const topicPerformanceElement = document.getElementById('topic-performance');
const reviewContainer = document.getElementById('review-container');
const choiceElements = Array.from(document.getElementsByClassName('choice-text'));
const topicButtons = Array.from(document.getElementsByClassName('topic-btn'));
const difficultyButtons = Array.from(document.getElementsByClassName('difficulty-btn'));

// State variables
let currentQuestion = {};
let acceptingAnswers = false;
let score = 0;
let questionCounter = 0;
let availableQuestions = [];
let selectedTopic = '';
let selectedDifficulty = '';
let timer;
let timeLeft = 60;
let userAnswers = [];
let topicStats = {};
let questions = [];

// Initialize
async function init() {
    try {
        const response = await fetch('../js/questions.json');
        if (!response.ok) throw new Error('Network response was not ok');
        questions = await response.json();
    } catch (err) {
        console.error('Failed to load questions:', err);
        alert('Could not load quiz questions. Please check your internet connection or path.');
        return;
    }

    // Add event listeners
    topicButtons.forEach(button => {
        button.addEventListener('click', () => {
            topicButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedTopic = button.getAttribute('data-topic');
            checkStartButtonState();
        });
    });

    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedDifficulty = button.getAttribute('data-difficulty');
            checkStartButtonState();
        });
    });

    if (startButton) startButton.addEventListener('click', startGame);
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            acceptingAnswers = false;
            explanationContainer.classList.add('hide');
            nextButton.classList.add('hide');
            // Reset all containers before next question
            document.querySelectorAll('.choice-container').forEach(container => {
                container.classList.remove('correct', 'incorrect');
            });
            getNewQuestion();
        });
    }

    // Attach click listener to choice containers for better hit area
    document.querySelectorAll('.choice-container').forEach(container => {
        container.addEventListener('click', (e) => {
            if (!acceptingAnswers) return;
            
            // Find the choice text element within this container
            const choiceText = container.querySelector('.choice-text');
            if (choiceText) {
                handleSelection(choiceText, container);
            }
        });
    });

    const playAgainBtn = document.getElementById('play-again');
    if (playAgainBtn) playAgainBtn.addEventListener('click', startGame);

    const goHomeBtn = document.getElementById('go-home');
    if (goHomeBtn) goHomeBtn.addEventListener('click', goHome);

    const showAnswersBtn = document.getElementById('show-answers');
    if (showAnswersBtn) showAnswersBtn.addEventListener('click', showReview);

    const backToEndBtn = document.getElementById('back-to-end');
    if (backToEndBtn) {
        backToEndBtn.addEventListener('click', () => {
            reviewElement.classList.add('hide');
            endElement.classList.remove('hide');
        });
    }
}

function handleSelection(choiceElement, containerElement) {
    acceptingAnswers = false;
    clearInterval(timer);
    
    const selectedAnswer = parseInt(choiceElement.dataset.number);
    const isCorrect = selectedAnswer === currentQuestion.answer;
    const classToApply = isCorrect ? 'correct' : 'incorrect';
    
    if (isCorrect) incrementScore();
    
    // Apply feedback to the container
    containerElement.classList.add(classToApply);
    
    // If incorrect, also highlight the correct one
    if (!isCorrect) {
        document.querySelectorAll('.choice-text').forEach(choice => {
            if (parseInt(choice.dataset.number) === currentQuestion.answer) {
                choice.parentElement.classList.add('correct');
            }
        });
    }
    
    // Record user's answer
    userAnswers.push({
        question: currentQuestion.question,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.answer,
        isCorrect: isCorrect,
        topic: currentQuestion.topic,
        choices: currentQuestion.choices,
        explanation: currentQuestion.explanation
    });
    
    // Update topic statistics
    if (!topicStats[currentQuestion.topic]) {
        topicStats[currentQuestion.topic] = { correct: 0, total: 0 };
    }
    topicStats[currentQuestion.topic].total++;
    if (isCorrect) topicStats[currentQuestion.topic].correct++;
    
    // Show explanation and next button
    explanationText.textContent = currentQuestion.explanation;
    explanationContainer.classList.remove('hide');
    
    // Show next button after a short delay for feedback to sink in
    setTimeout(() => {
        if (nextButton) {
            nextButton.classList.remove('hide');
            // Smoothly scroll to the bottom to show the next button if it's off-screen
            nextButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 500);
}

// Function skeleton removed to match previous handleChoiceClick call which was replaced by handleSelection

function checkStartButtonState() {
    if (selectedTopic && selectedDifficulty) {
        startButton.disabled = false;
    } else {
        startButton.disabled = true;
    }
}

function startGame() {
    score = 0;
    questionCounter = 0;
    userAnswers = [];
    topicStats = {};
    
    // Filter questions
    availableQuestions = [...questions];
    if (selectedTopic !== 'all') {
        availableQuestions = availableQuestions.filter(q => q.topic === selectedTopic);
    }
    
    if (selectedDifficulty !== 'mixed') {
        availableQuestions = availableQuestions.filter(q => q.difficulty === selectedDifficulty);
    }
    
    // Shuffle and limit
    availableQuestions.sort(() => Math.random() - 0.5);
    availableQuestions = availableQuestions.slice(0, 10);
    
    if (scoreElement) scoreElement.innerText = 0;
    
    homeElement.classList.add('hide');
    endElement.classList.add('hide');
    reviewElement.classList.add('hide');
    quizElement.classList.remove('hide');
    
    getNewQuestion();
}

function getNewQuestion() {
    if (availableQuestions.length === 0 || questionCounter >= availableQuestions.length) {
        return endQuiz();
    }
    
    questionCounter++;
    if (questionCounterElement) questionCounterElement.innerText = `${questionCounter}/${availableQuestions.length}`;
    
    currentQuestion = availableQuestions[questionCounter - 1];
    if (questionElement) questionElement.innerText = currentQuestion.question;
    
    const topicMap = {
        'programming': 'Programming in C',
        'oop': 'Object-Oriented Programming',
        'database': 'Database Management System',
        'web': 'Web Technology I',
        'scripting': 'Scripting Language'
    };
    if (topicIndicatorElement) topicIndicatorElement.innerText = `Topic: ${topicMap[currentQuestion.topic]}`;
    
    choiceElements.forEach((choice, index) => {
        choice.innerText = currentQuestion.choices[index];
        choice.parentElement.classList.remove('correct', 'incorrect');
    });
    
    acceptingAnswers = true;
    startTimer();
}

function startTimer() {
    timeLeft = 60;
    if (timerElement) timerElement.innerText = timeLeft;
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        if (timerElement) timerElement.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            timeUp();
        }
    }, 1000);
}

function timeUp() {
    acceptingAnswers = false;
    userAnswers.push({
        question: currentQuestion.question,
        userAnswer: null,
        correctAnswer: currentQuestion.answer,
        isCorrect: false,
        topic: currentQuestion.topic,
        choices: currentQuestion.choices,
        explanation: currentQuestion.explanation
    });
    
    if (!topicStats[currentQuestion.topic]) {
        topicStats[currentQuestion.topic] = { correct: 0, total: 0 };
    }
    topicStats[currentQuestion.topic].total++;
    
    explanationText.textContent = currentQuestion.explanation;
    explanationContainer.classList.remove('hide');
    nextButton.classList.remove('hide');
}

function incrementScore() {
    score++;
    if (scoreElement) scoreElement.innerText = score;
}

function endQuiz() {
    quizElement.classList.add('hide');
    endElement.classList.remove('hide');
    
    const totalQuestions = userAnswers.length;
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    
    if (finalScoreElement) finalScoreElement.innerText = `Your score: ${score} out of ${totalQuestions}`;
    if (correctCountElement) correctCountElement.innerText = correctAnswers;
    if (incorrectCountElement) incorrectCountElement.innerText = userAnswers.filter(a => !a.isCorrect && a.userAnswer !== null).length;
    if (unansweredCountElement) unansweredCountElement.innerText = userAnswers.filter(a => a.userAnswer === null).length;
    
    topicPerformanceElement.innerHTML = '';
    for (const topic in topicStats) {
        const percentage = Math.round((topicStats[topic].correct / topicStats[topic].total) * 100);
        const div = document.createElement('div');
        div.classList.add('topic-stat');
        div.innerHTML = `<strong>${topic}:</strong> ${topicStats[topic].correct}/${topicStats[topic].total} (${percentage}%)`;
        topicPerformanceElement.appendChild(div);
    }
}

function goHome() {
    endElement.classList.add('hide');
    homeElement.classList.remove('hide');
    topicButtons.forEach(btn => btn.classList.remove('active'));
    difficultyButtons.forEach(btn => btn.classList.remove('active'));
    selectedTopic = '';
    selectedDifficulty = '';
    if (startButton) startButton.disabled = true;
}

function showReview() {
    endElement.classList.add('hide');
    reviewElement.classList.remove('hide');
    reviewContainer.innerHTML = '';
    
    userAnswers.forEach((answer, index) => {
        const reviewItem = document.createElement('div');
        reviewItem.classList.add('review-item');
        reviewItem.innerHTML = `
            <strong>Question ${index + 1}</strong>
            <div class="review-question">${answer.question}</div>
            <div class="review-choices">
                ${answer.choices.map((choice, i) => {
                    const num = i + 1;
                    let cls = 'review-choice';
                    if (num === answer.userAnswer) cls += answer.isCorrect ? ' correct' : ' incorrect';
                    else if (num === answer.correctAnswer) cls += ' correct';
                    return `<div class="${cls}">${String.fromCharCode(65+i)}. ${choice}</div>`;
                }).join('')}
            </div>
            <div class="review-explanation">${answer.explanation}</div>
        `;
        reviewContainer.appendChild(reviewItem);
    });
}

document.addEventListener('DOMContentLoaded', init);