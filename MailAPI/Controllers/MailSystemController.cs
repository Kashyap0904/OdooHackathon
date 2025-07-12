using MailAPI;
using MailAPI.Model;
using Microsoft.AspNetCore.Mvc;

namespace MailAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MailSystemController : ControllerBase
    {
        private IEmailSender _emailSender;
        public MailSystemController(IEmailSender emailSender)
        {
            this._emailSender = emailSender;
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send([FromBody] MailRequestDTOModel request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Type))
                return BadRequest("Email and Type are required.");

            string subject = "";
            string htmlBody = "";

            switch (request.Type.ToLower())
            {
                case "newfeature":
                    subject = "New Feature Released";
                    htmlBody = NewFeatureToUsers(request.Title, request.Description);
                    break;

                case "updatefeature":
                    subject = "Feature Update Notification";
                    htmlBody = FeatureUpdateToUsers(request.Title, request.Description);
                    break;

                case "downtime":
                    subject = "Scheduled Downtime Alert";
                    htmlBody = DowntimeAlertToUsers(request.Title, request.Description);
                    break;

                default:
                    return BadRequest("Invalid message type.");
            }

            await _emailSender.SendEmailAsync3(request.Email, subject, htmlBody);
            return Ok("Email sent successfully.");
        }
        private static string FeatureUpdateToUsers(string FeatureTitle, string FeatureDescription)
        {
            return "<!DOCTYPE html>\r\n" +
            "<html lang=\"en\">\r\n" +
            "<head>\r\n" +
            "    <meta charset=\"UTF-8\">\r\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n" +
            "    <title>Feature Update</title>\r\n" +
            "    <style>\r\n" +
            "        body {\r\n" +
            "            font-family: Arial, sans-serif;\r\n" +
            "            background-color: #f4f4f9;\r\n" +
            "            margin: 0;\r\n" +
            "            padding: 0;\r\n" +
            "        }\r\n" +
            "        .container {\r\n" +
            "            max-width: 600px;\r\n" +
            "            margin: 0 auto;\r\n" +
            "            background-color: #ffffff;\r\n" +
            "            padding: 20px;\r\n" +
            "            border-radius: 8px;\r\n" +
            "            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\r\n" +
            "        }\r\n" +
            "        h1 {\r\n" +
            "            color: #333333;\r\n" +
            "            font-size: 22px;\r\n" +
            "            margin-bottom: 10px;\r\n" +
            "        }\r\n" +
            "        p {\r\n" +
            "            color: #555555;\r\n" +
            "            margin: 0 0 10px;\r\n" +
            "            line-height: 1.5;\r\n" +
            "        }\r\n" +
            "        .feature-section {\r\n" +
            "            background-color: #fffbe6;\r\n" +
            "            padding: 15px;\r\n" +
            "            border-left: 4px solid #f4b400;\r\n" +
            "            border-radius: 4px;\r\n" +
            "            margin: 20px 0;\r\n" +
            "        }\r\n" +
            "        .feature-title {\r\n" +
            "            font-size: 18px;\r\n" +
            "            font-weight: bold;\r\n" +
            "            margin-bottom: 5px;\r\n" +
            "            color: #333;\r\n" +
            "        }\r\n" +
            "        .footer {\r\n" +
            "            margin-top: 20px;\r\n" +
            "            font-size: 12px;\r\n" +
            "            color: #888888;\r\n" +
            "            text-align: center;\r\n" +
            "        }\r\n" +
            "        .logo {\r\n" +
            "            text-align: center;\r\n" +
            "            margin-top: 30px;\r\n" +
            "        }\r\n" +
            "        .logo img {\r\n" +
            "            width: 100%;\r\n" +
            "            height: auto;\r\n" +
            "            max-width: 150px;\r\n" +
            "        }\r\n" +
            "    </style>\r\n" +
            "</head>\r\n" +
            "<body>\r\n" +
            "    <div class=\"container\">\r\n" +
            "        <h1>We've Improved an Existing Feature!</h1>\r\n" +
            "        <p>We’ve made some important updates to one of your favorite features:</p>\r\n" +
            "        <div class=\"feature-section\">\r\n" +
            "            <div class=\"feature-title\">" + FeatureTitle + "</div>\r\n" +
            "            <div>" + FeatureDescription + "</div>\r\n" +
            "        </div>\r\n" +
            "        <p>We hope this update enhances your experience. As always, thank you for being with us!</p>\r\n" +
            "        <p>Best regards,<br>The Team</p>\r\n" +
            "        <div class=\"logo\">\r\n" +
            "            <img src=\"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmPE7yTUe9LJnDy-IKhQ7O16Ix9jmMD0CBTA&s\" alt=\"Company Logo\" />\r\n" +
            "        </div>\r\n" +
            "        <div class=\"footer\">\r\n" +
            "            &copy; 2025 Company Name. All rights reserved.\r\n" +
            "        </div>\r\n" +
            "    </div>\r\n" +
            "</body>\r\n" +
            "</html>";
        }

        private static string NewFeatureToUsers(string FeatureTitle, string FeatureDescription)
        {
            return "<!DOCTYPE html>\r\n" +
            "<html lang=\"en\">\r\n" +
            "<head>\r\n" +
            "    <meta charset=\"UTF-8\">\r\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n" +
            "    <title>New Feature Update</title>\r\n" +
            "    <style>\r\n" +
            "        body {\r\n" +
            "            font-family: Arial, sans-serif;\r\n" +
            "            background-color: #f4f4f9;\r\n" +
            "            margin: 0;\r\n" +
            "            padding: 0;\r\n" +
            "        }\r\n" +
            "        .container {\r\n" +
            "            max-width: 600px;\r\n" +
            "            margin: 0 auto;\r\n" +
            "            background-color: #ffffff;\r\n" +
            "            padding: 20px;\r\n" +
            "            border-radius: 8px;\r\n" +
            "            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\r\n" +
            "        }\r\n" +
            "        h1 {\r\n" +
            "            color: #333333;\r\n" +
            "            font-size: 22px;\r\n" +
            "            margin-bottom: 10px;\r\n" +
            "        }\r\n" +
            "        p {\r\n" +
            "            color: #555555;\r\n" +
            "            margin: 0 0 10px;\r\n" +
            "            line-height: 1.5;\r\n" +
            "        }\r\n" +
            "        .feature-section {\r\n" +
            "            background-color: #f9f9ff;\r\n" +
            "            padding: 15px;\r\n" +
            "            border-left: 4px solid #4a90e2;\r\n" +
            "            border-radius: 4px;\r\n" +
            "            margin: 20px 0;\r\n" +
            "        }\r\n" +
            "        .feature-title {\r\n" +
            "            font-size: 18px;\r\n" +
            "            font-weight: bold;\r\n" +
            "            margin-bottom: 5px;\r\n" +
            "            color: #333;\r\n" +
            "        }\r\n" +
            "        .footer {\r\n" +
            "            margin-top: 20px;\r\n" +
            "            font-size: 12px;\r\n" +
            "            color: #888888;\r\n" +
            "            text-align: center;\r\n" +
            "        }\r\n" +
            "        .logo {\r\n" +
            "            text-align: center;\r\n" +
            "            margin-top: 30px;\r\n" +
            "        }\r\n" +
            "        .logo img {\r\n" +
            "            width: 100%;\r\n" +
            "            height: auto;\r\n" +
            "            max-width: 150px;\r\n" +
            "        }\r\n" +
            "    </style>\r\n" +
            "</head>\r\n" +
            "<body>\r\n" +
            "    <div class=\"container\">\r\n" +
            "        <h1>We’ve Launched a New Feature!</h1>\r\n" +
            "        <p>We're excited to let you know about a new feature we've just released:</p>\r\n" +
            "        <div class=\"feature-section\">\r\n" +
            "            <div class=\"feature-title\">" + FeatureTitle + "</div>\r\n" +
            "            <div>" + FeatureDescription + "</div>\r\n" +
            "        </div>\r\n" +
            "        <p>We hope you find it helpful. Stay tuned for more updates!</p>\r\n" +
            "        <p>Best regards,<br>The Team</p>\r\n" +
            "        <div class=\"logo\">\r\n" +
            "            <img src=\"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmPE7yTUe9LJnDy-IKhQ7O16Ix9jmMD0CBTA&s\" alt=\"Company Logo\" />\r\n" +
            "        </div>\r\n" +
            "        <div class=\"footer\">\r\n" +
            "            &copy; 2025 Company Name. All rights reserved.\r\n" +
            "        </div>\r\n" +
            "    </div>\r\n" +
            "</body>\r\n" +
            "</html>";
        }

        private static string DowntimeAlertToUsers(string DowntimeTitle, string DowntimeDescription)
        {
            return "<!DOCTYPE html>\r\n" +
            "<html lang=\"en\">\r\n" +
            "<head>\r\n" +
            "    <meta charset=\"UTF-8\">\r\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n" +
            "    <title>Downtime Alert</title>\r\n" +
            "    <style>\r\n" +
            "        body {\r\n" +
            "            font-family: Arial, sans-serif;\r\n" +
            "            background-color: #f4f4f9;\r\n" +
            "            margin: 0;\r\n" +
            "            padding: 0;\r\n" +
            "        }\r\n" +
            "        .container {\r\n" +
            "            max-width: 600px;\r\n" +
            "            margin: 0 auto;\r\n" +
            "            background-color: #ffffff;\r\n" +
            "            padding: 20px;\r\n" +
            "            border-radius: 8px;\r\n" +
            "            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\r\n" +
            "        }\r\n" +
            "        h1 {\r\n" +
            "            color: #d9534f;\r\n" +
            "            font-size: 22px;\r\n" +
            "            margin-bottom: 10px;\r\n" +
            "        }\r\n" +
            "        p {\r\n" +
            "            color: #555555;\r\n" +
            "            margin: 0 0 10px;\r\n" +
            "            line-height: 1.5;\r\n" +
            "        }\r\n" +
            "        .alert-section {\r\n" +
            "            background-color: #fff0f0;\r\n" +
            "            padding: 15px;\r\n" +
            "            border-left: 4px solid #d9534f;\r\n" +
            "            border-radius: 4px;\r\n" +
            "            margin: 20px 0;\r\n" +
            "        }\r\n" +
            "        .alert-title {\r\n" +
            "            font-size: 18px;\r\n" +
            "            font-weight: bold;\r\n" +
            "            margin-bottom: 5px;\r\n" +
            "            color: #b52b27;\r\n" +
            "        }\r\n" +
            "        .footer {\r\n" +
            "            margin-top: 20px;\r\n" +
            "            font-size: 12px;\r\n" +
            "            color: #888888;\r\n" +
            "            text-align: center;\r\n" +
            "        }\r\n" +
            "        .logo {\r\n" +
            "            text-align: center;\r\n" +
            "            margin-top: 30px;\r\n" +
            "        }\r\n" +
            "        .logo img {\r\n" +
            "            width: 100%;\r\n" +
            "            height: auto;\r\n" +
            "            max-width: 150px;\r\n" +
            "        }\r\n" +
            "    </style>\r\n" +
            "</head>\r\n" +
            "<body>\r\n" +
            "    <div class=\"container\">\r\n" +
            "        <h1>Important Downtime Notification</h1>\r\n" +
            "        <p>Please note the following scheduled downtime or service interruption:</p>\r\n" +
            "        <div class=\"alert-section\">\r\n" +
            "            <div class=\"alert-title\">" + DowntimeTitle + "</div>\r\n" +
            "            <div>" + DowntimeDescription + "</div>\r\n" +
            "        </div>\r\n" +
            "        <p>We apologize for any inconvenience and appreciate your understanding.</p>\r\n" +
            "        <p>Thank you,<br>The Team</p>\r\n" +
            "        <div class=\"logo\">\r\n" +
            "            <img src=\"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmPE7yTUe9LJnDy-IKhQ7O16Ix9jmMD0CBTA&s\" alt=\"Company Logo\" />\r\n" +
            "        </div>\r\n" +
            "        <div class=\"footer\">\r\n" +
            "            &copy; 2025 Company Name. All rights reserved.\r\n" +
            "        </div>\r\n" +
            "    </div>\r\n" +
            "</body>\r\n" +
            "</html>";
        }

    }
}
