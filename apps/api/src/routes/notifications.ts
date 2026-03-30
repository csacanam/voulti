import { FastifyInstance } from 'fastify';
import { NotificationService } from '../business/notificationService';

export async function notificationsRoutes(app: FastifyInstance) {
  
  // Process pending email notifications (called by external worker)
  app.post('/process-emails', async (req, res) => {
    try {
      console.log('📧 Processing pending email notifications...');
      
      const notificationService = new NotificationService();
      await notificationService.processAllPendingEmails();
      
      return res.send({
        success: true,
        message: 'All pending email notifications processed successfully'
      });
      
    } catch (error: any) {
      console.error('Error processing email notifications:', error);
      return res.status(500).send({
        error: error.message || 'Failed to process email notifications'
      });
    }
  });

  // Process pending URL confirmations (called by external worker)
  app.post('/process-url-confirmations', async (req, res) => {
    try {
      console.log('🔗 Processing pending URL confirmations...');
      
      const notificationService = new NotificationService();
      await notificationService.processAllPendingUrlConfirmations();
      
      return res.send({
        success: true,
        message: 'All pending URL confirmations processed successfully'
      });
      
    } catch (error: any) {
      console.error('Error processing URL confirmations:', error);
      return res.status(500).send({
        error: error.message || 'Failed to process URL confirmations'
      });
    }
  });

}
