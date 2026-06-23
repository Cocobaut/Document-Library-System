# Viettel Document Management System

## Setup Instructions

### 1. Create Virtual Environment
Open your terminal in the `Viettel` folder and run the following command to create a virtual environment:
```bat
python -m venv venv
```

Activate the virtual environment:
- On Windows:
  ```bat
  venv\Scripts\activate
  ```

### 2. Install Requirements
With the virtual environment activated, install the backend dependencies:
```bat
pip install -r requirements.txt
```
*(Note: Since `requirements.txt` contains both backend and frontend dependencies as per your request, pip might show errors on the frontend packages. For the frontend, you should still run `npm install` inside the `Frontend` folder to properly download the Node modules).*

### 3. Run the Application (`run.bat`)
A `run.bat` script has been provided to easily start both the Backend (FastAPI) and Frontend (Vite) simultaneously.
Simply double-click `run.bat` or run it from your terminal:
```bat
.\run.bat
```

### 4. Open in Browser
When the `run.bat` script launches the frontend terminal (running Vite), simply type `o` and press `Enter` in that terminal window. 
This will automatically open the web application in your default browser.

*(If you ever need to execute standalone TypeScript files directly, you can use the `tsx` command. For example: `npx tsx filename.ts`)*
