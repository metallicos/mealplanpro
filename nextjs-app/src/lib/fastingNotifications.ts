'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';

// Fasting stage definitions for notifications
const FASTING_STAGES = [
    { hours: 4, title: 'Early Fasting', body: 'Blood sugar normalizing, insulin dropping' },
    { hours: 8, title: 'Fat Burning Mode', body: 'Your body is now using fat for energy! 🔥' },
    { hours: 12, title: 'Ketosis Beginning', body: 'Ketone production starting - enhanced mental clarity' },
    { hours: 16, title: 'Autophagy Activated', body: 'Cellular repair and recycling has begun! ♻️' },
    { hours: 18, title: 'Deep Autophagy', body: 'Significant cellular cleaning in progress ✨' },
    { hours: 24, title: 'Growth Hormone Surge', body: 'HGH up to 5x baseline - maximum benefits! 💪' },
];

class FastingNotificationService {
    private isNative: boolean;
    private hasPermission: boolean = false;

    constructor() {
        this.isNative = Capacitor.isNativePlatform();
    }

    async requestPermission(): Promise<boolean> {
        if (!this.isNative) {
            console.log('Notifications only available on native platforms');
            return false;
        }

        try {
            const permission = await LocalNotifications.requestPermissions();
            this.hasPermission = permission.display === 'granted';
            return this.hasPermission;
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return false;
        }
    }

    async checkPermission(): Promise<boolean> {
        if (!this.isNative) return false;

        try {
            const permission = await LocalNotifications.checkPermissions();
            this.hasPermission = permission.display === 'granted';
            return this.hasPermission;
        } catch (error) {
            console.error('Failed to check notification permission:', error);
            return false;
        }
    }

    async scheduleFastingNotifications(startTime: Date, goalHours: number): Promise<void> {
        if (!this.isNative || !this.hasPermission) {
            const hasPermission = await this.requestPermission();
            if (!hasPermission) return;
        }

        try {
            // Cancel any existing fasting notifications first
            await this.cancelFastingNotifications();

            const notifications: LocalNotificationSchema[] = [];
            const now = Date.now();

            FASTING_STAGES.forEach((stage, index) => {
                if (stage.hours <= goalHours) {
                    const triggerTime = new Date(startTime.getTime() + stage.hours * 60 * 60 * 1000);

                    // Only schedule if the notification time is in the future
                    if (triggerTime.getTime() > now) {
                        notifications.push({
                            id: 1000 + index, // Use 1000+ range for fasting notifications
                            title: `🎯 ${stage.title}`,
                            body: stage.body,
                            schedule: { at: triggerTime },
                            sound: 'default',
                            smallIcon: 'ic_launcher',
                            largeIcon: 'ic_launcher',
                            channelId: 'fasting-channel',
                        });
                    }
                }
            });

            // Schedule goal completion notification
            const goalTime = new Date(startTime.getTime() + goalHours * 60 * 60 * 1000);
            if (goalTime.getTime() > now) {
                notifications.push({
                    id: 1099, // Goal completion notification
                    title: '🏆 Fasting Goal Complete!',
                    body: `Congratulations! You've completed your ${goalHours}h fast!`,
                    schedule: { at: goalTime },
                    sound: 'default',
                    smallIcon: 'ic_launcher',
                    largeIcon: 'ic_launcher',
                    channelId: 'fasting-channel',
                });
            }

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications });
                console.log(`Scheduled ${notifications.length} fasting notifications`);
            }
        } catch (error) {
            console.error('Failed to schedule fasting notifications:', error);
        }
    }

    async cancelFastingNotifications(): Promise<void> {
        if (!this.isNative) return;

        try {
            // Get all pending notifications and cancel fasting ones (IDs 1000-1099)
            const pending = await LocalNotifications.getPending();
            const fastingIds = pending.notifications
                .filter(n => n.id >= 1000 && n.id < 1100)
                .map(n => ({ id: n.id }));

            if (fastingIds.length > 0) {
                await LocalNotifications.cancel({ notifications: fastingIds });
                console.log(`Cancelled ${fastingIds.length} fasting notifications`);
            }
        } catch (error) {
            console.error('Failed to cancel fasting notifications:', error);
        }
    }

    async showProgressNotification(elapsed: number, goal: number, currentStage: string): Promise<void> {
        if (!this.isNative || !this.hasPermission) return;

        try {
            const remaining = Math.max(goal - elapsed, 0);
            const hours = Math.floor(remaining);
            const minutes = Math.floor((remaining - hours) * 60);

            await LocalNotifications.schedule({
                notifications: [{
                    id: 999, // Progress notification ID
                    title: `⏱️ Fasting: ${currentStage}`,
                    body: remaining > 0
                        ? `${hours}h ${minutes}m remaining to reach your goal`
                        : '🎉 Goal reached! Great job!',
                    ongoing: true,
                    autoCancel: false,
                    smallIcon: 'ic_launcher',
                    largeIcon: 'ic_launcher',
                    channelId: 'fasting-progress',
                }]
            });
        } catch (error) {
            console.error('Failed to show progress notification:', error);
        }
    }

    async clearProgressNotification(): Promise<void> {
        if (!this.isNative) return;

        try {
            await LocalNotifications.cancel({ notifications: [{ id: 999 }] });
        } catch (error) {
            console.error('Failed to clear progress notification:', error);
        }
    }
}

export const fastingNotifications = new FastingNotificationService();
