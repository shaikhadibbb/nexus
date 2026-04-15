// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA TYPE DEFINITIONS
// Types for media uploads, processing, and CDN delivery
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseEntity } from './common';

/**
 * Media asset types
 */
export type MediaType = 'image' | 'video' | 'audio' | 'gif';

/**
 * Media processing status
 */
export type MediaProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

/**
 * Core media asset entity
 */
export interface MediaAsset extends BaseEntity {
  uploaderId: string;
  
  // Type and format
  type: MediaType;
  mimeType: string;
  
  // Storage
  storageKey: string; // S3/CDN key
  url: string; // CDN URL
  
  // Dimensions and size
  width: number;
  height: number;
  aspectRatio: number;
  sizeBytes: number;
  durationSeconds: number | null; // For video/audio
  
  // Visual placeholders
  blurhash: string | null;
  dominantColor: string | null;
  thumbnailUrl: string | null;
  
  // Accessibility
  altText: string | null;
  altTextGenerated: boolean; // AI-generated
  
  // Processing
  processingStatus: MediaProcessingStatus;
  processingError: string | null;
  
  // Variants (different sizes/formats)
  variants: MediaVariant[];
  
  // Moderation
  isExplicit: boolean;
  moderationLabels: string[];
}

/**
 * Media variant for responsive delivery
 */
export interface MediaVariant {
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  width: number;
  height: number;
  url: string;
  sizeBytes: number;
  format: string; // webp, avif, mp4, etc.
}

/**
 * Upload initialization response
 */
export interface UploadInitResponse {
  uploadId: string;
  mediaId: string;
  uploadUrl: string; // Pre-signed S3 URL
  uploadMethod: 'PUT' | 'POST';
  uploadHeaders: Record<string, string>;
  expiresAt: Date | string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

/**
 * Upload completion input
 */
export interface UploadCompleteInput {
  uploadId: string;
  mediaId: string;
  altText?: string;
}

/**
 * Upload progress event
 */
export interface UploadProgress {
  mediaId: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  blur?: number;
}

/**
 * Video processing options
 */
export interface VideoProcessingOptions {
  transcode?: {
    codec: 'h264' | 'h265' | 'vp9';
    maxBitrate?: number;
  };
  resize?: {
    maxWidth?: number;
    maxHeight?: number;
  };
  generateThumbnail?: boolean;
  generatePreview?: boolean; // Short animated preview
}
