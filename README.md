# Overlays

Frontend project for overlays UI. This repository follows a branch-based workflow where all changes are reviewed before merging into the main branch.

---

## Setup

1. Clone the repository:
```bash
git clone https://github.com/cerealkiller30/overlays.git
````

2. Install Node.js (if not already installed):
   [https://nodejs.org/en/](https://nodejs.org/en/)

3. Install dependencies:

```bash
cd overlays
npm install
```

4. Start the server:

```bash
npm run dev
```

---

## Keep your local repo updated

Before starting work, pull the latest changes:

```bash
git pull origin main
```

---

## Contribution Workflow

Direct pushes to `main` are not allowed.

### 1. Create a new branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make changes and commit

```bash
git add .
git commit -m "Describe your changes"
```

### 3. Push your branch

```bash
git push origin feature/your-feature-name
```

---

## How to Create a Pull Request

After pushing your branch, follow these steps on GitHub:

1. Go to your repository page
2. You will see a prompt like “Compare & pull request” — click it

   * If not visible, go to the "Pull requests" tab and click "New pull request"
3. Set:

   * Base branch: `main`
   * Compare branch: your branch (e.g., `feature/your-feature-name`)
4. Add:

   * A clear title
   * A short description of what you changed
5. Click **Create pull request**

---

## What Happens Next

* Your pull request will be reviewed
* You may be asked to make changes
* Push updates to the same branch (PR updates automatically)
* Once approved, it will be merged into `main`

---

## Branch Naming Convention

* `feature/...` for new features
* `fix/...` for bug fixes
* `hotfix/...` for urgent fixes
* `experiment/...` for testing ideas

---

## Navigation (Without Backend)

To navigate between pages:

* Check `App.jsx`
* Refer to the `Route` paths in the default export function

---

## Rules

* Do not commit directly to `main`
* All changes must go through pull requests
* Keep commits clear and descriptive

