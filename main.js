// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmSay4GcodjXJaTlrmGB4fqEPLA5b2V9o",
  authDomain: "granafacil-58053.firebaseapp.com",
  projectId: "granafacil-58053",
  storageBucket: "granafacil-58053.appspot.com",
  messagingSenderId: "162272759269",
  appId: "1:162272759269:web:e023deddb8bbde6fec730c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let incomeChart, expenseChart;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("welcome-username").textContent = user.displayName;
    show("welcome-container");
    setTimeout(loadTransactions, 300);
  } else {
    show("auth-container");
  }
});

window.signup = async () => {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const username = document.getElementById("signup-username").value;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: username });
  location.reload();
};

window.login = async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  await signInWithEmailAndPassword(auth, email, password);
};

window.logout = async () => {
  await signOut(auth);
  location.reload();
};

window.goToDashboard = () => {
  show("dashboard-container");
  setupAddButton();
  loadTransactions();
};

function setupAddButton() {
  const addBtn = document.getElementById("addBtn");
  if (!addBtn) return;

  addBtn.onclick = async () => {
    const amount = parseFloat(document.getElementById("amount").value);
    const description = document.getElementById("description").value;
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;

    if (!amount || !description || !type || !category) {
      alert("Preencha todos os campos!");
      return;
    }

    await addDoc(collection(db, "transactions"), {
      uid: currentUser.uid,
      amount,
      description,
      type,
      category,
      createdAt: new Date()
    });

    document.getElementById("amount").value = "";
    document.getElementById("description").value = "";
    document.getElementById("type").value = "income";
    document.getElementById("category").value = "comida";
  };
}

function loadTransactions() {
  const q = query(collection(db, "transactions"), where("uid", "==", currentUser.uid));
  onSnapshot(q, (snapshot) => {
    const transactions = [];
    snapshot.forEach((doc) => transactions.push({ id: doc.id, ...doc.data() }));
    renderData(transactions);
  });
}

function renderData(transactions) {
  const historyList = document.getElementById("history-list");
  const balanceSpan = document.getElementById("balance");

  historyList.innerHTML = "";

  let balance = 0;
  const incomeData = {};
  const expenseData = {};

  transactions.forEach((t) => {
    const li = document.createElement("li");
    li.className = t.type;
    li.innerHTML = `
      ${t.type === "income" ? "+" : "-"} R$ ${t.amount.toFixed(2)} | ${t.description} | ${t.category}
      <button onclick="removeTransaction('${t.id}')">Remover</button>
    `;
    historyList.appendChild(li);

    if (t.type === "income") {
      incomeData[t.category] = (incomeData[t.category] || 0) + t.amount;
      balance += t.amount;
    } else {
      expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
      balance -= t.amount;
    }
  });

  balanceSpan.textContent = `R$ ${balance.toFixed(2)}`;
  updateCharts(incomeData, expenseData);
}

window.removeTransaction = async (id) => {
  await deleteDoc(doc(db, "transactions", id));
};

function updateCharts(incomeData, expenseData) {
  if (incomeChart) incomeChart.destroy();
  if (expenseChart) expenseChart.destroy();

  incomeChart = new Chart(document.getElementById("incomeChart"), {
    type: "pie",
    data: {
      labels: Object.keys(incomeData),
      datasets: [{
        data: Object.values(incomeData),
        backgroundColor: ["lime", "lightgreen", "green"]
      }]
    }
  });

  expenseChart = new Chart(document.getElementById("expenseChart"), {
    type: "pie",
    data: {
      labels: Object.keys(expenseData),
      datasets: [{
        data: Object.values(expenseData),
        backgroundColor: ["red", "tomato", "darkred"]
      }]
    }
  });
}

function show(id) {
  ["auth-container", "signup-container", "welcome-container", "dashboard-container"].forEach((el) => {
    const element = document.getElementById(el);
    if (element) element.classList.add("hidden");
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
}
