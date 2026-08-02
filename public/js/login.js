import { auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const errorText = document.getElementById('error-text');
const formCaption = document.getElementById('form-caption');
const switchPrompt = document.getElementById('switch-prompt');
const switchLink = document.getElementById('switch-link');
const forgotLink = document.getElementById('forgot-link');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Whitelist so returnTo can't be abused as an open redirect to an external URL.
const ALLOWED_RETURN_PAGES = ['home.html', 'review.html', 'study.html', 'profile.html'];
function getReturnTo() {
  const requested = new URLSearchParams(window.location.search).get('returnTo');
  return ALLOWED_RETURN_PAGES.includes(requested) ? requested : 'home.html';
}

let mode = 'signin';

function setMode(newMode) {
  mode = newMode;
  errorText.textContent = '';
  const isSignin = mode === 'signin';
  tabSignin.classList.toggle('active', isSignin);
  tabSignup.classList.toggle('active', !isSignin);
  submitBtn.textContent = isSignin ? 'sign in' : 'sign up';
  formCaption.textContent = isSignin ? 'sign in to continue your progress' : 'create an account to get started';
  switchPrompt.textContent = isSignin ? "don't have an account?" : 'already have an account?';
  switchLink.textContent = isSignin ? 'sign up' : 'sign in';
}

tabSignin.addEventListener('click', () => setMode('signin'));
tabSignup.addEventListener('click', () => setMode('signup'));
switchLink.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));

function friendlyError(code) {
  const map = {
    'auth/invalid-email': 'that email address looks invalid.',
    'auth/user-not-found': 'no account found with that email.',
    'auth/wrong-password': 'incorrect password.',
    'auth/invalid-credential': 'incorrect email or password.',
    'auth/email-already-in-use': 'an account already exists with that email.',
    'auth/weak-password': 'password should be at least 6 characters.',
  };
  return map[code] || 'something went wrong. please try again.';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorText.textContent = '';
  submitBtn.disabled = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  try {
    if (mode === 'signin') {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    window.location.href = getReturnTo();
  } catch (err) {
    errorText.textContent = friendlyError(err.code);
  } finally {
    submitBtn.disabled = false;
  }
});

forgotLink.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    errorText.textContent = 'enter your email above first, then click "forgot?"';
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    errorText.textContent = 'password reset email sent.';
  } catch (err) {
    errorText.textContent = friendlyError(err.code);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = getReturnTo();
  }
});
