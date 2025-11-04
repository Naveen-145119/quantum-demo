# -*- coding: utf-8 -*-
"""
Created on Thu Oct 30 14:06:45 2025

@author: Welcome
"""

import tkinter as tk
from tkinter import messagebox, filedialog
import os
from datetime import datetime
from cryptography.fernet import Fernet
import boto3
import random

# File paths
users_file = 'users.txt'
key_file = 'quantum.key'
upload_folder = 'uploads'

# AWS Configuration
AWS_BUCKET_NAME = 'your-s3-bucket-name'  # <-- Replace this with your actual bucket

# Ensure upload folder exists
if not os.path.exists(upload_folder):
    os.makedirs(upload_folder)

current_user = None


# === Utility Functions ===

def simulate_quantum_key(bits=256):
    return Fernet.generate_key()


def save_user(username, password, email, mobile):
    with open(users_file, 'a') as f:
        f.write(f"{username},{password},{email},{mobile}\n")


def validate_user(username, password):
    if not os.path.exists(users_file):
        return False
    with open(users_file, 'r') as f:
        for line in f:
            u, p, _, _ = line.strip().split(',')
            if u == username and p == password:
                return True
    return False


def encrypt_file(filepath, key):
    cipher = Fernet(key)
    with open(filepath, 'rb') as file:
        data = file.read()
    encrypted = cipher.encrypt(data)
    filename = os.path.basename(filepath)
    encrypted_path = os.path.join(upload_folder, f'{filename}.enc')
    with open(encrypted_path, 'wb') as f:
        f.write(encrypted)
    return encrypted_path


def upload_to_s3(filepath):
    try:
        s3 = boto3.client('s3')
        filename = os.path.basename(filepath)
        s3.upload_file(filepath, AWS_BUCKET_NAME, filename)
        return True
    except Exception as e:
        print("Upload failed:", e)
        return False


# === GUI Windows ===

def open_register():
    reg = tk.Toplevel(root)
    reg.title('Register')

    tk.Label(reg, text="Username").pack()
    username = tk.Entry(reg)
    username.pack()

    tk.Label(reg, text="Password").pack()
    password = tk.Entry(reg, show='*')
    password.pack()

    tk.Label(reg, text="Email").pack()
    email = tk.Entry(reg)
    email.pack()

    tk.Label(reg, text="Mobile").pack()
    mobile = tk.Entry(reg)
    mobile.pack()

    def submit():
        if not all([username.get(), password.get(), email.get(), mobile.get()]):
            messagebox.showerror("Error", "All fields are required")
            return
        save_user(username.get(), password.get(), email.get(), mobile.get())
        messagebox.showinfo("Success", "Registration successful")
        reg.destroy()

    tk.Button(reg, text='Register', command=submit, width=20, height=2).pack(pady=5)


def open_login():
    log = tk.Toplevel(root)
    log.title('Login')

    tk.Label(log, text="Username").pack()
    uname = tk.Entry(log)
    uname.pack()

    tk.Label(log, text="Password").pack()
    pwd = tk.Entry(log, show='*')
    pwd.pack()

    def login():
        global current_user
        if validate_user(uname.get(), pwd.get()):
            current_user = uname.get()
            messagebox.showinfo("Login", f"Welcome {current_user}")
            log.destroy()
            open_upload_window()
        else:
            messagebox.showerror("Error", "Invalid credentials")

    tk.Button(log, text='Login', command=login, width=20, height=2).pack(pady=5)


def open_upload_window():
    upload = tk.Toplevel(root)
    upload.title(f"Secure Upload - {current_user}")

    tk.Label(upload, text="Select a text file to upload securely").pack(pady=5)

    file_entry = tk.Entry(upload, width=50)
    file_entry.pack()

    def browse():
        path = filedialog.askopenfilename(filetypes=[("Text files", "*.txt")])
        file_entry.delete(0, tk.END)
        file_entry.insert(0, path)

    def secure_upload():
        filepath = file_entry.get()
        if not filepath:
            messagebox.showerror("Error", "Please select a file")
            return
        # Simulate QKD to get encryption key
        key = simulate_quantum_key()
        # Save the key locally (in real QKD, this would be secure shared)
        with open(key_file, 'wb') as kf:
            kf.write(key)
        encrypted_file = encrypt_file(filepath, key)
        messagebox.showinfo("Success", "Encryoted Successfully")
        '''
        if upload_to_s3(encrypted_file):
            messagebox.showinfo("Success", f"Encrypted and uploaded to S3:\n{os.path.basename(encrypted_file)}")
        else:
            messagebox.showerror("Error", "Upload failed")
        '''

    tk.Button(upload, text='Browse', command=browse, width=20, height=2).pack(pady=5)
    tk.Button(upload, text='Secure Upload', command=secure_upload, width=25, height=2).pack(pady=5)


# === Main App Window ===

root = tk.Tk()
root.title("Quantum Secure File Upload")

tk.Label(root, text="Quantum Secure File Upload System", font=('Arial', 16)).pack(pady=10)

tk.Button(root, text="Register", command=open_register, width=30, height=2).pack(pady=5)
tk.Button(root, text="Login", command=open_login, width=30, height=2).pack(pady=5)

root.mainloop()