import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
}

const TermsDialog: React.FC<TermsDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ textAlign: 'right' }}>
        📜 תנאי שימוש באפליקציה / Terms of Use
      </DialogTitle>

      <DialogContent dividers sx={{ textAlign: 'right', direction: 'rtl' }}>
        <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
          <Typography variant="body2" paragraph>
            השימוש באפליקציה זו כפוף לתנאים הבאים (English version below).
          </Typography>

          <Typography variant="body2" paragraph>
            1. האפליקציה נועדה לשימוש אישי בלבד ואינה מיועדת לשימוש מסחרי,
            עסקי, פרסומי או כל שימוש אחר ללא אישור בכתב מהמפתח.
            <strong> שימוש מסחרי ללא רשות מפורשת אסור בהחלט.</strong>
          </Typography>

          <Typography variant="body2" paragraph>
            2. כל זכויות הקניין הרוחני באפליקציה שמורות לבעליה החוקיים.
            אין להעתיק, לשכפל, להפיץ או לבצע בה שינויים ללא אישור מראש.
          </Typography>

          <Typography variant="body2" paragraph>
            3. האפליקציה מסופקת כפי שהיא (AS IS). המפתח אינו אחראי לכל נזק
            ישיר או עקיף הנובע מהשימוש בה.
          </Typography>

          <Typography variant="body2" paragraph>
            4. ייתכן שהאפליקציה תאסוף מידע טכני לצורכי תפעול, אבטחה ושיפור
            השירות בלבד. מידע אישי לא יימסר לגורם שלישי אלא אם נדרש על פי דין.
          </Typography>

          <Typography variant="body2" paragraph>
            5. המפתח רשאי לשנות, לעדכן או להפסיק את השירות בכל עת וללא הודעה
            מוקדמת. המשך שימוש מהווה הסכמה לתנאים המעודכנים.
          </Typography>

          <Typography variant="body2" paragraph>
            6. תנאים אלה כפופים לחוקי מדינת ישראל, וסמכות השיפוט הבלעדית נתונה
            לבתי המשפט בתל-אביב.
          </Typography>

          <Typography
            variant="body2"
            paragraph
            sx={{ fontWeight: 'bold', mt: 3 }}
          >
            לפניות ובירורים:  
            <br />
            {/* שם: ‎<PRIVATE_PERSON>   */}
            <br />
            {/* טלפון: ‎<PRIVATE_PHONE>   */}
            <br />
            {/* דוא״ל: ‎your@email.com */}
          </Typography>

          <Typography
            variant="body2"
            paragraph
            align="center"
            sx={{ mt: 3, fontWeight: 'bold' }}
          >
            © 2025 כל הזכויות שמורות / All rights reserved.
          </Typography>

          {/* English section */}
          <Box sx={{ direction: 'ltr', textAlign: 'left', mt: 4 }}>
            <Typography variant="body2" paragraph>
              1. This application is for personal use only and may not be used
              for commercial or business purposes without written consent from
              the developer.
            </Typography>
            <Typography variant="body2" paragraph>
              2. All intellectual property rights belong to the legal owner.
              Copying, distribution, modification, or reverse engineering is
              prohibited.
            </Typography>
            <Typography variant="body2" paragraph>
              3. The app is provided “AS IS.” The developer is not liable for
              any damages arising from its use.
            </Typography>
            <Typography variant="body2" paragraph>
              4. These terms are governed by Israeli law; exclusive jurisdiction
              rests with the Tel Aviv courts.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="contained">
          סגור / Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsDialog;
