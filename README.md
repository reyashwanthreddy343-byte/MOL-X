# MOL-X 🧬
**Physics-Aware Biomolecular Simulation Engine**
> Deep Generative AI platform for Computational Drug Discovery

### 🏆 Key Results
![Molecules Synthesized](https://img.shields.io/badge/Molecules_Synthesized-45%2C210%2B-success)
![Validation Accuracy](https://img.shields.io/badge/Validation_Accuracy-94%25-blue)
![Bower AI Hackathon](https://img.shields.io/badge/Bower_AI_Hackathon-Shortlisted-gold)

## 💡 What MOL-X Does
Developing a single new FDA-approved drug takes 10-15 years and costs $2.6 billion. The biggest bottleneck is "data starvation" in the Lead Discovery phase—researchers have exhausted chemical databases and cannot manually test the 10⁶⁰ possible drug-like molecules. 

**MOL-X** solves this using a custom PyTorch Variational Autoencoder (VAE) to computationally generate entirely novel synthetic drug compound datasets. Unlike standard LLMs, every generated molecule is validated through a rigorous physics engine (RDKit) enforcing Lipinski's Rule of 5, ensuring the AI never hallucinates fake or biologically impossible chemistry.

##  Core Features
*    **Generative AI Pipeline:** A highly optimized VAE that maps chemical properties into a 32-D continuous latent space.
*    **The Hybrid Lab:** Mathematically interpolates between two existing FDA-approved drugs in vector space to create novel biological cross-breeds.
*    **Pareto Optimization (NSGA-II):** Evolutionary algorithm that balances maximum disease-killing efficacy with minimum human toxicity.
*    **4-Way ML Evaluation:** Scikit-Learn Random Forest models that run a Turing Test to prove the generated data mathematically mirrors real biological laws.
*    **Hardware-Accelerated 3D Analytics:** 60-FPS rendering of rotating molecular structures natively in the browser using WebGL and 3Dmol.js.

## 🛠️ Tech Stack
| Category | Technologies |
| :--- | :--- |
| **Artificial Intelligence** | PyTorch, NVIDIA CUDA (Variational Autoencoder) |
| **Physics & Validation** | RDKit, Scikit-Learn, Pandas, NumPy |
| **Backend API** | Python, FastAPI, Uvicorn (Fully Asynchronous) |
| **Frontend UI** | React, TypeScript, Vite, Tailwind CSS, 3Dmol.js, Plotly.js |

## 🚀 How to Run Locally

### 1. Clone the Repository
```bash
git clone https://github.com/reyashwanthreddy343-byte/MOL-X.git
cd MOL-X
```

### 2. Start the Backend Server (AI Engine)
```bash
cd backend
python -m pip install fastapi uvicorn rdkit scikit-learn pandas torch
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Start the Frontend App (React UI)
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

## 📸 Screenshots
*   **Dashboard View:** `<img width="2560" height="1440" alt="Screenshot (450)" src="https://github.com/user-attachments/assets/289915db-0bd1-4f6b-8d53-1398d0818476" />
*   
`
*   **Generate Pipeline:** `<img width="2560" height="1440" alt="Screenshot (450)" src="https://github.com/user-attachments/assets/6864ad8b-a6fd-4171-a756-a37b3ada592f" />
*   
`
*   **Hybrid Lab:** `<img width="2560" height="1440" alt="Screenshot (459)" src="https://github.com/user-attachments/assets/e0d4cee8-f229-437b-ba22-a62dbfdedbbb" /><img width="2560" height="1440" alt="Screenshot (456)" src="https://github.com/user-attachments/assets/4412da5a-0855-428e-a6a4-29d0b58dfbd6" />
<img width="2560" height="1440" alt="Screenshot (455)" src="https://github.com/user-attachments/assets/56837b84-2154-4b35-af4e-0e954ac89552" />
<img width="2560" height="1440" alt="Screenshot (460)" src="https://github.com/user-attachments/assets/60980237-98fe-42c4-ab66-fcec16ce1124" />

`

## 📄 License
This project is open-source and available under the MIT License.
