class Video < ApplicationRecord
  belongs_to :owner, class_name: "User"
  has_many :user_videos
  has_many :users, through: :user_videos
end
