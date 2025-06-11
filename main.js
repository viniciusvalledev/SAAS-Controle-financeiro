// main.js - VERSÃO CORRIGIDA
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
  onSnapshot,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    // Sua firebaseConfig permanece a mesma
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

const categories = {
  expense: [
    'Comida', 'Transporte', 'Moradia', 'Contas', 'Lazer', 
    'Saúde', 'Compras', 'Educação', 'Investimentos', 'Impostos', 'Outros'
  ],
  income: [
    'Salário', 'Freelance', 'Vendas', 'Investimentos', 'Presente', 'Outros'
  ]
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    // O direcionamento agora é feito principalmente no login/signup/logout
  } else {
    currentUser = null;
    show("auth-container");
  }
});

window.signup = async () => {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const username = document.getElementById("signup-username").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    
    // Leva direto para o painel após o cadastro
    document.getElementById("welcome-username").textContent = username;
    show("welcome-container");

  } catch (error) {
    alert("Erro ao criar conta: " + error.message);
  }
};

// ===================================================================
// AQUI ESTÁ A FUNÇÃO CORRIGIDA
// ===================================================================
window.login = async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    // 1. Faz o login do usuário
    await signInWithEmailAndPassword(auth, email, password);
    
    // 2. ATUALIZADO: Vai direto para o painel
    show('dashboard-container'); 
    
    // 3. ATUALIZADO: Inicia o painel e força o carregamento das transações
    setupDashboard();

  } catch(error) {
    alert("Erro ao fazer login: " + error.message);
  }
};
// ===================================================================

window.logout = async () => {
  await signOut(auth);
  location.reload();
};

window.goToDashboard = () => {
  show("dashboard-container");
  setupDashboard();
};

function updateCategoryOptions() {
  const type = document.getElementById("type").value;
  const categorySelect = document.getElementById("category");
  categorySelect.innerHTML = ''; // Limpa as opções atuais

  const currentCategories = categories[type];
  currentCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.toLowerCase();
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

function setupDashboard() {
  const addBtn = document.getElementById("addBtn");
  const typeSelect = document.getElementById("type");
  
  typeSelect.onchange = updateCategoryOptions;
  updateCategoryOptions();
  
  if (!addBtn) return;

  addBtn.onclick = async () => {
    const amount = parseFloat(document.getElementById("amount").value);
    const description = document.getElementById("description").value.trim();
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
  };

  loadTransactions();
}

function loadTransactions() {
  if (!currentUser) return;
  const q = query(collection(db, "transactions"), where("uid", "==", currentUser.uid), orderBy("createdAt", "desc"));
  
  onSnapshot(q, (snapshot) => {
    const transactions = [];
    snapshot.forEach((doc) => transactions.push({ id: doc.id, ...doc.data() }));
    renderData(transactions);
  });
}

function renderData(transactions) {
  const historyList = document.getElementById("history-list");
  const balanceSpan = document.getElementById("balance");
  if (!historyList || !balanceSpan) return;

  historyList.innerHTML = "";

  let balance = 0;
  const incomeData = {};
  const expenseData = {};

  transactions.forEach((t) => {
    const li = document.createElement("li");
    li.className = t.type;
    li.innerHTML = `
      ${t.type === "income" ? "+" : "-"} R$ ${t.amount.toFixed(2)} | ${t.description} | ${t.category}
      <button class="btn-remove" onclick="removeTransaction('${t.id}')">Remover</button>
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
  if (confirm("Tem certeza que deseja remover esta transação?")) {
      await deleteDoc(doc(db, "transactions", id));
  }
};

function updateCharts(incomeData, expenseData) {
  if (incomeChart) incomeChart.destroy();
  if (expenseChart) expenseChart.destroy();
  
  const incomeCanvas = document.getElementById("incomeChart");
  const expenseCanvas = document.getElementById("expenseChart");
  if (!incomeCanvas || !expenseCanvas) return;

  incomeChart = new Chart(incomeCanvas, {
    type: "pie",
    data: {
      labels: Object.keys(incomeData),
      datasets: [{
        data: Object.values(incomeData),
      }]
    }
  });

  expenseChart = new Chart(expenseCanvas, {
    type: "pie",
    data: {
      labels: Object.keys(expenseData),
      datasets: [{
        data: Object.values(expenseData),
      }]
    }
  });
}

function show(id) {
  ["auth-container", "signup-container", "welcome-container", "dashboard-container"].forEach((elId) => {
    const element = document.getElementById(elId);
    if (element) element.classList.add("hidden");
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
}