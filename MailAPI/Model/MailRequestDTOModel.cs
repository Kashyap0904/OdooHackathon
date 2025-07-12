namespace MailAPI.Model
{
    public class MailRequestDTOModel
    {
        public string Email { get; set; }
        public string Type { get; set; } // e.g., "NewFeature", "UpdateFeature", "Downtime"
        public string Title { get; set; }
        public string Description { get; set; }
    }
}
