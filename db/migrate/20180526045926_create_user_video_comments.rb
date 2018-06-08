class CreateUserVideoComments < ActiveRecord::Migration[5.0]
  def change
    create_table :user_video_comments do |t|
      t.references :user_video, foreign_key: true
      t.float :offset
      t.string :content

      t.timestamps
    end
  end
end
