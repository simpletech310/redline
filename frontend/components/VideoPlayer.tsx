'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}

export function VideoPlayer({ src, poster, autoPlay = false, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('landscape');
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = video;
      setDuration(video.duration);

      // Determine aspect ratio
      const ratio = videoWidth / videoHeight;
      if (ratio < 0.9) {
        setAspectRatio('portrait');
      } else if (ratio > 1.1) {
        setAspectRatio('landscape');
      } else {
        setAspectRatio('square');
      }
    };

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Hide controls after inactivity
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const timeout = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    setHasUserInteracted(true);

    if (isPlaying) {
      video.pause();
    } else {
      // Unmute on first play interaction
      if (!hasUserInteracted) {
        video.muted = false;
        setIsMuted(false);
      }
      video.play().catch(() => {
        // If autoplay with sound fails, try muted
        video.muted = true;
        setIsMuted(true);
        video.play();
      });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;

    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Container styles based on aspect ratio
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: aspectRatio === 'portrait' ? '280px' : '100%',
    margin: aspectRatio === 'portrait' ? '0 auto' : undefined,
    borderRadius: 'var(--card-radius)',
    overflow: 'hidden',
    background: '#000',
    // Use aspect-ratio for proper sizing
    aspectRatio: aspectRatio === 'portrait' ? '9/16' : aspectRatio === 'square' ? '1/1' : undefined,
  };

  const videoStyle: React.CSSProperties = {
    width: '100%',
    height: aspectRatio === 'portrait' ? '100%' : 'auto',
    display: 'block',
    maxHeight: aspectRatio === 'portrait' ? '520px' : '400px',
    objectFit: aspectRatio === 'portrait' ? 'cover' : 'contain',
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onClick={togglePlay}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        preload="metadata"
        style={videoStyle}
      />

      {/* Play button overlay (when paused) */}
      {!isPlaying && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 24px rgba(239, 68, 68, 0.5)',
              transition: 'transform 0.2s ease',
            }}
          >
            <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          opacity: showControls || !isPlaying ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls || !isPlaying ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          onClick={handleProgressClick}
          style={{
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            cursor: 'pointer',
            marginBottom: '0.75rem',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--crimson-500)',
              borderRadius: '2px',
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        {/* Control buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={togglePlay}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPlaying ? (
              <Pause size={20} color="#fff" />
            ) : (
              <Play size={20} color="#fff" fill="#fff" />
            )}
          </button>

          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMuted ? (
              <VolumeX size={18} color="#fff" />
            ) : (
              <Volume2 size={18} color="#fff" />
            )}
          </button>

          {/* Time display */}
          <span style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            flex: 1,
          }}>
            {formatTime((progress / 100) * duration)} / {formatTime(duration)}
          </span>

          <button
            onClick={toggleFullscreen}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Maximize size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* Muted indicator (show when muted and playing) */}
      {isPlaying && isMuted && (
        <button
          onClick={toggleMute}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            padding: '0.5rem',
            background: 'rgba(0, 0, 0, 0.7)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}
        >
          <VolumeX size={14} />
          Tap for sound
        </button>
      )}

      {/* Aspect ratio indicator */}
      {aspectRatio === 'portrait' && (
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            padding: '0.25rem 0.5rem',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '6px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          9:16
        </div>
      )}
    </div>
  );
}
