---

name: deploy-token-pro
description: Use this when user wants to deploy a token with validation, metadata formatting, and execution.

Deploy Token Pro Skill

Purpose

This skill helps deploy a token with proper validation and structured execution.

---

Step 1: Collect Required Inputs

Ask the user for:

- Token Name
- Token Symbol
- Description (optional but recommended)
- Image URL (must be PNG)
- Website (optional)
- Twitter (optional)
- Wallet Address (deployer)

If any required field is missing → ask again.

---

Step 2: Validate Inputs

- Token Name: minimum 2 characters
- Symbol: max 6 uppercase letters
- Image must be PNG
- Wallet must be valid 0x address

---

Step 3: Execute Deployment

Send request to backend:

POST /launch

---

Step 4: Handle Response

- Return contract address
- Confirm success
- Handle errors clearly

---