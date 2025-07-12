using System.Net.Mail;

namespace MailAPI
{
    public interface IEmailSender
    {
        Task SendEmailAsync3(string email, string subject, string message);
    }
}
