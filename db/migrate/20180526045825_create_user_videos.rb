class CreateUserVideos < ActiveRecord::Migration[5.0]
  def change
    create_table :user_videos do |t|
      t.references :user, index: true
      t.references :video, foreign_key: true
      t.boolean :is_owner
      t.datetime :last_seen

      t.timestamps
    end
  end
end
