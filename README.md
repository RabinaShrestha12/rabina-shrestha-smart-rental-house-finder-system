Project Title

Smart Rental House Finder
Smart Rental House Finder is an online rental management system that aims to bring together tenants, property owners, service providers and administrators to manage all activities related to rentals in a single platform. Some of the features offered by the system include user registration, login, property listing management, smart property search, booking requests, rental agreements, payment management, communication management, maintenance support, roommate finder, expense management, virtual furniture placement, notifications, and dashboard-based management. It will simplify, expedite, and streamline the rental process using a role based and user friendly system.


Project Objective
The primary aim of this project will be to come up with a smart rental management system that addresses the typical issues encountered in the renting process. The system should enhance user experience with an easy, effective and interactive web interface. It helps users to find the property, interact with one another, make and manage booking, process agreements and payments, get notifications and utilize other smart tools to make better decisions during the rental process.

Features

The system provides the following features:

User registration
User login and authentication
Role-based dashboards for Admin, Owner, Tenant, and Service Provider
Email or OTP verification support during registration
Property listing creation and management
Public property browsing
Smart property search and filtering
Booking request submission and management
Tenant and owner communication system
Rental contract and agreement handling
Payment handling and eSewa integration
Booking payment tracking
Maintenance request submission and management
Provider communication and inbox
Notification and reminder system
Review and rating system
Roommate finder
Roommate chat
AI-based search suggestion
Expense tracker
Budget split calculator
Virtual furniture placement
360-degree room/property view
Secure logout system

Technologies Used
Frontend
React.js
JSX
CSS
JavaScript
Axios
React Router
Backend
Python
Django
Django REST Framework
Database
SQLite3
Deployment
Vercel / Render / local deployment setup

System Requirements

Hardware
Computer or laptop
Internet connection
Smartphone can also be used for web access if deployed online

Software
Web browser such as Google Chrome or Mozilla Firefox
Node.js
Python
pip
Virtual environment support
Code editor such as Visual Studio Code

Installation and Setup

Steps to run the project locally:

1. Clone the repository
git clone https://github.com/username/projectname.git
2. Go to the project folder
cd rabina-shrestha-smart-rental-system
3. Install required dependencies
For Backend
cd Backend/myproject
pip install -r requirements.txt
Activate virtual environment
myvenv\Scripts\activate
For Frontend
cd Frontend/smart-rental-frontend
npm install
4. Run the application
Run backend server
cd Backend/myproject
python manage.py runserver
Run frontend server
cd Frontend/smart-rental-frontend
npm start

The backend usually runs at: http://127.0.0.1:8000/

The frontend usually runs at: http://localhost:3000/

Live Project

Live URL of the deployed system: https://rabina-shrestha-smart-ren-git-d852bd-rabinashrestha12s-projects.vercel.app/

Project Structure

![alt text](image-20.png)

Screenshots

Add some screenshots of the system here.
Login page
You can login by using the email and password that you have insert while register.

![alt text](image-10.png)


Registration page
In this place you have to filled teh form according to your prefernce like owner, service provider and tenat and teh otp will be send in the email you have to insert that otp after that you can login.

![alt text](image-11.png)

Public home page
This is the home page where you can see some features like this in the image.

![alt text](image-12.png)

![alt text](image-13.png)

![alt text](image-14.png)

![alt text](image-15.png)

![alt text](image-16.png)


Property listing page
This is the part where any user can see the property list but they cannot book it. 

![alt text](image-17.png)

Property details page
This is the property details page where you can see the property details like this image.

![alt text](image-18.png)

Tenant Dashboard
The is the Tenant Dashbord.

![alt text](image-3.png)

Owner Dashboard
This is teh Owner Dashboard.

![alt text](image-1.png)

Service Provider Dashboard
This is the Service Provider Dashboard.

![alt text](image-19.png)

Booking request page
This is the request booking dashboard where tenant can asked for booking to owner and when the owner accept that request then only user can go for payemnt process but tenant can chat with owner with the same request message help.

![alt text](image-7.png)

![alt text](image-6.png)

Contract page
This is the contract page of owner and tenant. For owner they have to aggre with teh aggremnt to insert the proeprty whereas tenant have to aggre the contract paper which was send by teh owner.

![alt text](image-2.png)

![alt text](image-4.png)

Roommate finder page
This is teh roomate finder page at first yo have to add the requirement of your tehn click on teh finder button and it will show liek this.

![alt text](image-5.png)

Virtual furniture page
This is the virtual furniture placement page yu have to insert teh room image and then used other furniture to decorate the room by filling all that form part.

![alt text](image-8.png)

Expense tracker page
This is teh Expense page where you can track your expenses.

![alt text](image-9.png)

Maintenance request page
This is the maintenance request page where owner can request for service provider for help at first you have fill teh form and teh you have to choose the service provider for that problem.

![alt text](image.png)


How to Start the Project

To start the project properly, both backend and frontend servers need to run at the same time.

First, start the Django backend server from the backend folder using python manage.py runserver. After that, start the React frontend from the frontend folder using npm start. When both servers are running, open the frontend URL in the browser. The frontend will communicate with the backend APIs to load data, submit forms, authenticate users, and manage the complete system workflow.

How to Run the Project

The project works in two parts:

Backend

The backend handles:

authentication
API requests
role-based permissions
database operations
booking logic
contract logic
payment logic
notification logic
maintenance and messaging functions

Run backend with:python manage.py runserver

Frontend

The frontend handles:
user interface
navigation
dashboards
forms
property search pages
chat pages
payment pages
contract pages
maintenance pages

Run frontend with: npm start

Future Improvements

Possible improvements for the system:

Mobile application version
Improved user interface and user experience
Stronger payment verification and security features
More advanced map search and location intelligence
Live notification support
Better analytics dashboard
Cloud deployment and scaling
Advanced filtering system
More accurate roommate matching
Improved image upload and 360-degree room support


Authors

Student Name: Rabina Shrestha
Project Title: Smart Rental House Finder
Program / Department: Bsc(Hons). Computing
University / College Name: Itahari International College

License

This project is created for educational purposes as part of a Final Year Project.