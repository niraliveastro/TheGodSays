"use client";

import { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, Video as VideoIcon, Trash2, Edit2 } from "lucide-react";
import Image from "next/image";

export default function GalleryModal({ isOpen, onClose, astrologerId, isOwner }) {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchGallery();
    }
  }, [isOpen, astrologerId]);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/astrologer/gallery?astrologerId=${astrologerId}`);
      const data = await response.json();
      setGallery(data.gallery || []);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (editingItem) {
      // Update existing item
      setUploading(true);
      try {
        const response = await fetch("/api/astrologer/gallery", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astrologerId,
            itemId: editingItem.id,
            title,
            description,
          }),
        });

        if (!response.ok) throw new Error("Failed to update item");

        // Reset form
        setEditingItem(null);
        setTitle("");
        setDescription("");
        
        // Refresh gallery
        await fetchGallery();
      } catch (error) {
        console.error("Error updating:", error);
        alert("Failed to update. Please try again.");
      } finally {
        setUploading(false);
      }
    } else {
      // Upload new item
      if (!selectedFile || !astrologerId) return;

      setUploading(true);
      try {
        // Upload file
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("astrologerId", astrologerId);

        console.log("Uploading file:", {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        });

        const uploadResponse = await fetch("/api/astrologer/gallery/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: "Unknown error" }));
          console.error("Upload failed:", errorData);
          throw new Error(errorData.error || "Failed to upload file");
        }

        const uploadData = await uploadResponse.json();

        // Add to gallery
        const addResponse = await fetch("/api/astrologer/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astrologerId,
            mediaUrl: uploadData.mediaUrl,
            mediaType: uploadData.mediaType,
            title,
            description,
            thumbnailUrl: uploadData.thumbnailUrl,
          }),
        });

        if (!addResponse.ok) {
          throw new Error("Failed to add to gallery");
        }

        // Reset form
        setSelectedFile(null);
        setTitle("");
        setDescription("");
        setPreviewUrl("");
        
        // Refresh gallery
        await fetchGallery();
      } catch (error) {
        console.error("Error uploading:", error);
        alert("Failed to upload. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setTitle(item.title || "");
    setDescription(item.description || "");
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handleDelete = async (itemId) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await fetch(
        `/api/astrologer/gallery?astrologerId=${astrologerId}&itemId=${itemId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchGallery();
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "var(--space-lg)",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "900px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-lg)",
            paddingBottom: "var(--space-md)",
            borderBottom: "1px solid var(--color-gray-200)",
          }}
        >
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              color: "var(--color-gray-900)",
            }}
          >
            Gallery
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-gray-500)",
            }}
          >
            <X style={{ width: "24px", height: "24px" }} />
          </button>
        </div>

        {/* Upload Section (Owner Only) */}
        {isOwner && (
          <div
            style={{
              marginBottom: "var(--space-xl)",
              padding: "var(--space-lg)",
              background: "#faf8f5",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-gray-200)",
            }}
          >
            <h4
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: "var(--space-md)",
                fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              }}
            >
              {editingItem ? "Edit Item" : "Add New Item"}
            </h4>

            {!editingItem && (
              <>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  style={{
                    marginBottom: "var(--space-md)",
                    width: "100%",
                  }}
                />

                {previewUrl && (
                  <div style={{ marginBottom: "var(--space-md)", position: "relative", height: "200px" }}>
                    {selectedFile?.type.startsWith("image/") ? (
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        style={{ objectFit: "contain", borderRadius: "var(--radius-md)" }}
                      />
                    ) : (
                      <video
                        src={previewUrl}
                        controls
                        style={{ width: "100%", height: "100%", borderRadius: "var(--radius-md)" }}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-gray-300)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-md)",
                fontSize: "0.95rem",
                fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                fontWeight: 600,
              }}
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid var(--color-gray-300)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--space-md)",
                fontSize: "0.95rem",
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleSubmit}
                disabled={(!selectedFile && !editingItem) || uploading}
                className="btn-primary"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: (selectedFile || editingItem) && !uploading ? "#d4af37" : "#ccc",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  cursor: (selectedFile || editingItem) && !uploading ? "pointer" : "not-allowed",
                  color: "#fff",
                  fontSize: "1rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <Upload style={{ width: "18px", height: "18px" }} />
                {uploading ? "Saving..." : editingItem ? "Update" : "Upload"}
              </button>
              {editingItem && (
                <button
                  onClick={handleCancelEdit}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "transparent",
                    border: "1px solid var(--color-gray-300)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    color: "var(--color-gray-700)",
                    fontSize: "1rem",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--color-gray-500)" }}>Loading...</p>
        ) : gallery.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "var(--space-lg)",
            }}
          >
            {gallery.map((item) => (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  background: "#fff",
                  border: "1px solid var(--color-gray-200)",
                }}
              >
                <div style={{ position: "relative", height: "200px" }}>
                  {item.mediaType === "image" ? (
                    <Image
                      src={item.mediaUrl}
                      alt={item.caption || "Gallery item"}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <video
                      src={item.mediaUrl}
                      controls
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  
                  {/* Media type badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      background: "rgba(0,0,0,0.6)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      color: "#fff",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {item.mediaType === "image" ? (
                      <ImageIcon style={{ width: "12px", height: "12px" }} />
                    ) : (
                      <VideoIcon style={{ width: "12px", height: "12px" }} />
                    )}
                    {item.mediaType}
                  </div>

                  {/* Action buttons (Owner Only) */}
                  {isOwner && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        onClick={() => handleEdit(item)}
                        style={{
                          background: "rgba(212, 175, 55, 0.9)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.5rem",
                          cursor: "pointer",
                          color: "#fff",
                        }}
                      >
                        <Edit2 style={{ width: "16px", height: "16px" }} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          background: "rgba(220, 38, 38, 0.9)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          padding: "0.5rem",
                          cursor: "pointer",
                          color: "#fff",
                        }}
                      >
                        <Trash2 style={{ width: "16px", height: "16px" }} />
                      </button>
                    </div>
                  )}
                </div>

                {(item.title || item.description) && (
                  <div style={{ padding: "0.75rem" }}>
                    {item.title && (
                      <h4
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          marginBottom: "0.25rem",
                          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                          color: "var(--color-gray-900)",
                        }}
                      >
                        {item.title}
                      </h4>
                    )}
                    {item.description && (
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--color-gray-700)",
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              textAlign: "center",
              color: "var(--color-gray-500)",
              padding: "var(--space-xl) 0",
            }}
          >
            No media in gallery yet
          </p>
        )}
      </div>
    </div>
  );
}
