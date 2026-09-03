import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { DocumentService } from '../services/document.service';

export class DocumentController {
  static async generateDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { type, relatedEntityId, remarks } = req.body;
      const data = await DocumentService.generateDocument(type, relatedEntityId, req.user!.userId, remarks);
      return res.status(201).json({ success: true, data, message: 'Document generated successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await DocumentService.getDocuments(req.query);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getDocumentById(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await DocumentService.getDocumentById(req.params.id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async voidDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await DocumentService.voidDocument(req.params.id, req.user!.userId, req.body.reason);
      return res.status(200).json({ success: true, data, message: 'Document voided successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
