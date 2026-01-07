import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getSession } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Hybrid Logic: Use Cloudinary if configured (for Vercel), else Local
        if (process.env.CLOUDINARY_CLOUD_NAME) {
            // Cloudinary Upload
            const result = await new Promise<any>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'mealplan_uploads' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(buffer);
            });

            return NextResponse.json({ url: result.secure_url });
        } else {
            // Local Upload (Fallback)
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = file.name.split('.').pop();
            const filename = `upload-${uniqueSuffix}.${ext}`;

            // Save to public/uploads/forum
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'forum');
            await mkdir(uploadDir, { recursive: true });
            const filepath = join(uploadDir, filename);

            await writeFile(filepath, buffer);

            const url = `/uploads/forum/${filename}`;
            return NextResponse.json({ url });
        }
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
