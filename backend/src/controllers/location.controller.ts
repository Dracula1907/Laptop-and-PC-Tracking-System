import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { LocationService } from '../services/location.service';

export class LocationController {
  static async getLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const locs = await LocationService.getLocations();
      return res.status(200).json({ success: true, data: locs });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async getLocationById(req: AuthenticatedRequest, res: Response) {
    try {
      const loc = await LocationService.getLocationById(req.params.id);
      return res.status(200).json({ success: true, data: loc });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  static async createLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const loc = await LocationService.createLocation(req.body, req.user!.userId);
      return res.status(201).json({ success: true, data: loc });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async updateLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const loc = await LocationService.updateLocation(req.params.id, req.body, req.user!.userId);
      return res.status(200).json({ success: true, data: loc });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
