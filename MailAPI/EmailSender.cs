using System.Net;
using System.Net.Mail;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;


using Microsoft.Extensions.Options;
using System.Threading.Tasks;

namespace MailAPI
{
    public class EmailSender : IEmailSender
    {
        private readonly IConfiguration _config;

        public EmailSender(IConfiguration config)
        {
            _config = config;
        }
        public async Task SendEmailAsync3(string email, string subject, string message)
        {
            var smtpSettings = _config.GetSection("SmtpSettings");

            using (var client = new System.Net.Mail.SmtpClient(smtpSettings["Server"], int.Parse(smtpSettings["Port"])))
            {
                client.Credentials = new NetworkCredential(smtpSettings["Username"], smtpSettings["Password"]);
                client.EnableSsl = true;

                using (var mailMessage = new MailMessage())
                {
                    mailMessage.From = new MailAddress(smtpSettings["Username"]);
                    mailMessage.To.Add(email); // You can add multiple recipients by repeating this line
                    mailMessage.Subject = subject;
                    mailMessage.Body = message;
                    mailMessage.IsBodyHtml = true; // If sending an HTML email, set to true

                    await client.SendMailAsync(mailMessage);
                }
            }
        }
    }
}
