
export const welcomeEmail = (username: string, email: string) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f4f5; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #10b981; margin: 0; font-size: 28px; }
        .content { color: #374151; font-size: 16px; line-height: 1.6; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Meal Plan Pro!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>Thanks for joining our community! We're excited to help you plan your meals, track your nutrition, and achieve your goals.</p>
            <p>Your account has been successfully created with email: ${email}</p>
            <center>
                <a href="https://meal-plan-pro.vercel.app/login" class="button">Go to Dashboard</a>
            </center>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Meal Plan Pro. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

export const newsletterSubscribedEmail = (username: string) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f4f5; padding: 40px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
        .header h1 { color: #10b981; margin: 0; }
        .content { color: #374151; font-size: 16px; line-height: 1.6; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Subscribed!</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>You have successfully subscribed to the Meal Plan Pro newsletter.</p>
            <p>Stay tuned for delicious recipes, nutrition tips, and app updates delivered straight to your inbox.</p>
        </div>
        <div class="footer">
            <p>You can unsubscribe at any time from your profile settings.</p>
            &copy; ${new Date().getFullYear()} Meal Plan Pro.
        </div>
    </div>
</body>
</html>
`;
