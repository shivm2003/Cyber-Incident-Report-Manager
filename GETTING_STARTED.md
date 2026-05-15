# Getting Started - Cyber Incident Intelligence Command Center

Follow these steps to set up and run the project on your local machine.

## 📋 Prerequisites
*   **Python 3.10+**
*   **Node.js 16+**
*   **Ollama** (for local AI processing)

---

## 🛠️ 1. Backend Setup

1.  Open a terminal and navigate to the backend directory:
    ```powershell
    cd backend
    ```

2.  Create a virtual environment:
    ```powershell
    python -m venv venv
    ```

3.  Activate the virtual environment:
    ```powershell
    .\venv\Scripts\Activate.ps1
    ```

4.  Install dependencies:
    ```powershell
    pip install -r requirements.txt
    ```

5.  Start the FastAPI server:
    ```powershell
    uvicorn main:app --reload
    ```
    *The API will be available at `http://localhost:8000`*

---

## 🎨 2. Frontend Setup

1.  Open a **new** terminal and navigate to the frontend directory:
    ```powershell
    cd frontend
    ```

2.  Install dependencies:
    ```powershell
    npm install
    ```

3.  Start the React development server:
    ```powershell
    npm run dev
    ```
    *The dashboard will be available at `http://localhost:5173`*

---

## 🧠 3. Shivam AI Setup (Ollama)

1.  Ensure **Ollama** is installed and running.
2.  Download the required model:
    ```powershell
    ollama run gemma:2b
    ```
3.  Keep Ollama running in the background for Shivam AI features to function.

---

## 📊 4. Usage Tips
*   Click **"Collect Intel"** to fetch the latest threats.
*   Use the **Company Impact Radar** to scan your tech stack.
*   Click on **Chart Bars** or **Stat Cards** to filter data instantly.




tasklist | findstr python